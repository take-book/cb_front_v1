import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { useServerSentEvents } from '../useServerSentEvents'
import type { StreamMessageRequest } from '../useServerSentEvents'

// Mock fetch and Response
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue('mock-access-token'),
  setItem: vi.fn(),
  removeItem: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

// Mock apiClient
vi.mock('../api/client', () => ({
  default: {
    defaults: {
      baseURL: 'http://localhost:8000'
    }
  }
}))

describe('useServerSentEvents - Stability Tests', () => {
  let serverSentEvents: ReturnType<typeof useServerSentEvents>
  let mockReader: any
  let mockResponse: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock ReadableStreamDefaultReader
    mockReader = {
      read: vi.fn(),
      releaseLock: vi.fn()
    }
    
    // Mock Response with ReadableStream
    mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      body: {
        getReader: vi.fn().mockReturnValue(mockReader)
      }
    }
    
    mockFetch.mockResolvedValue(mockResponse)
    
    serverSentEvents = useServerSentEvents()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Connection Stability', () => {
    it('should handle successful connection and streaming', async () => {
      const messageHandler = vi.fn()
      serverSentEvents.onMessage(messageHandler)

      // Mock successful stream data
      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"message_uuid":"test-123","content":"Hello"}\n\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: [DONE]\n\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })

      const request: StreamMessageRequest = {
        content: 'Test message',
        parent_message_uuid: 'parent-123'
      }

      // Act
      await serverSentEvents.sendStreamMessage('chat-123', request)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/chats/chat-123/messages/stream',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-access-token',
            'Accept': 'text/event-stream'
          }),
          body: JSON.stringify(request)
        })
      )

      expect(messageHandler).toHaveBeenCalledWith({
        type: 'chunk',
        data: { message_uuid: 'test-123', content: 'Hello' }
      })

      expect(messageHandler).toHaveBeenCalledWith({
        type: 'done',
        data: null
      })
    })

    it('should handle HTTP errors gracefully', async () => {
      mockResponse.ok = false
      mockResponse.status = 401
      mockResponse.statusText = 'Unauthorized'

      const request: StreamMessageRequest = {
        content: 'Test message'
      }

      await expect(
        serverSentEvents.sendStreamMessage('chat-123', request)
      ).rejects.toThrow('HTTP 401: Unauthorized')

      expect(serverSentEvents.error.value).toContain('HTTP 401: Unauthorized')
      expect(serverSentEvents.isConnected.value).toBe(false)
    })

    it('should handle missing response body', async () => {
      mockResponse.body = null

      const request: StreamMessageRequest = {
        content: 'Test message'
      }

      await expect(
        serverSentEvents.sendStreamMessage('chat-123', request)
      ).rejects.toThrow('Response body is null')
    })

    it('should handle authentication errors', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const request: StreamMessageRequest = {
        content: 'Test message'
      }

      // Should still attempt the request but with no auth token
      await serverSentEvents.sendStreamMessage('chat-123', request)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer null'
          })
        })
      )
    })
  })

  describe('Stream Processing Stability', () => {
    it('should handle malformed JSON in stream gracefully', async () => {
      const messageHandler = vi.fn()
      serverSentEvents.onMessage(messageHandler)

      // Mock stream with malformed JSON
      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {invalid json}\n\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"valid":"json"}\n\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })

      const request: StreamMessageRequest = {
        content: 'Test message'
      }

      // Should not throw error, but continue processing
      await expect(
        serverSentEvents.sendStreamMessage('chat-123', request)
      ).resolves.toBeUndefined()

      // Should still process valid JSON
      expect(messageHandler).toHaveBeenCalledWith({
        type: 'chunk',
        data: { valid: 'json' }
      })
    })

    it('should handle stream reading errors', async () => {
      const messageHandler = vi.fn()
      serverSentEvents.onMessage(messageHandler)

      // Mock stream reading error
      mockReader.read.mockRejectedValue(new Error('Stream reading failed'))

      const request: StreamMessageRequest = {
        content: 'Test message'
      }

      await serverSentEvents.sendStreamMessage('chat-123', request)

      // Should call error handler
      expect(messageHandler).toHaveBeenCalledWith({
        type: 'error',
        data: { message: 'Stream reading failed' }
      })
    })

    it('should handle different SSE data formats', async () => {
      const messageHandler = vi.fn()
      serverSentEvents.onMessage(messageHandler)

      // Mock different SSE formats
      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: chunk\ndata: {"content":"chunk1"}\n\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"event":"final","data":{"content":"final"}}\n\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: [DONE]\n\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })

      const request: StreamMessageRequest = {
        content: 'Test message'
      }

      await serverSentEvents.sendStreamMessage('chat-123', request)

      expect(messageHandler).toHaveBeenCalledWith({
        type: 'chunk',
        data: { content: 'chunk1' }
      })

      expect(messageHandler).toHaveBeenCalledWith({
        type: 'final',
        data: { content: 'final' }
      })

      expect(messageHandler).toHaveBeenCalledWith({
        type: 'done',
        data: null
      })
    })

    it('should handle chunked data properly', async () => {
      const messageHandler = vi.fn()
      serverSentEvents.onMessage(messageHandler)

      // Mock chunked data (partial lines)
      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"mess')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('age":"partial"}\n\ndata: {"complete":"message"}\n\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })

      const request: StreamMessageRequest = {
        content: 'Test message'
      }

      await serverSentEvents.sendStreamMessage('chat-123', request)

      // Should process complete message only
      expect(messageHandler).toHaveBeenCalledWith({
        type: 'chunk',
        data: { complete: 'message' }
      })
    })
  })

  describe('Resource Management', () => {
    it('should properly clean up connections', async () => {
      const messageHandler = vi.fn()
      serverSentEvents.onMessage(messageHandler)

      mockReader.read.mockResolvedValue({
        done: true,
        value: undefined
      })

      const request: StreamMessageRequest = {
        content: 'Test message'
      }

      await serverSentEvents.sendStreamMessage('chat-123', request)

      // Connection should be cleaned up
      expect(serverSentEvents.isConnected.value).toBe(false)
      expect(serverSentEvents.isConnecting.value).toBe(false)
    })

    it('should handle multiple concurrent requests properly', async () => {
      const messageHandler = vi.fn()
      serverSentEvents.onMessage(messageHandler)

      // Mock fast completion
      mockReader.read.mockResolvedValue({
        done: true,
        value: undefined
      })

      const request1: StreamMessageRequest = { content: 'Message 1' }
      const request2: StreamMessageRequest = { content: 'Message 2' }

      // Send concurrent requests
      const [result1, result2] = await Promise.allSettled([
        serverSentEvents.sendStreamMessage('chat-123', request1),
        serverSentEvents.sendStreamMessage('chat-123', request2)
      ])

      // Both should complete without errors
      expect(result1.status).toBe('fulfilled')
      expect(result2.status).toBe('fulfilled')
    })
  })

  describe('State Management', () => {
    it('should properly track connection state during full cycle', async () => {
      const messageHandler = vi.fn()
      serverSentEvents.onMessage(messageHandler)

      // Initial state
      expect(serverSentEvents.isConnected.value).toBe(false)
      expect(serverSentEvents.isConnecting.value).toBe(false)
      expect(serverSentEvents.error.value).toBeNull()

      // Mock successful stream
      mockReader.read
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"test":"data"}\n\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })

      const request: StreamMessageRequest = {
        content: 'Test message'
      }

      const sendPromise = serverSentEvents.sendStreamMessage('chat-123', request)

      // During send, should be connecting
      expect(serverSentEvents.isConnecting.value).toBe(true)

      await sendPromise

      // After completion, should be disconnected
      expect(serverSentEvents.isConnected.value).toBe(false)
      expect(serverSentEvents.isConnecting.value).toBe(false)
    })
  })
})