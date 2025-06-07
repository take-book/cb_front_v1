import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useStreamingMessage } from '../useStreamingMessage'
import type { SSEMessage } from '../useServerSentEvents'

// Mock useServerSentEvents
const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockSendStreamMessage = vi.fn()
const mockOnMessage = vi.fn()

vi.mock('../useServerSentEvents', () => ({
  useServerSentEvents: () => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    sendStreamMessage: mockSendStreamMessage,
    onMessage: mockOnMessage,
    isConnected: ref(false),
    isConnecting: ref(false),
    error: ref(null),
  })
}))

describe('useStreamingMessage - User Message Display', () => {
  let streamingMessage: ReturnType<typeof useStreamingMessage>
  let messageHandler: (message: SSEMessage) => void

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Capture the message handler when onMessage is called
    mockOnMessage.mockImplementation((handler) => {
      messageHandler = handler
    })
    
    streamingMessage = useStreamingMessage()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('User Message Immediate Display', () => {
    it('should immediately display user message when sendStreamingMessage is called', async () => {
      // Setup
      const chatUuid = 'test-chat-123'
      const userContent = 'Hello, how are you?'
      const parentMessageUuid = 'parent-123'

      // Act
      await streamingMessage.sendStreamingMessage(
        chatUuid,
        userContent,
        parentMessageUuid
      )

      // Assert - User message should be immediately visible
      expect(streamingMessage.streamingMessages.value.size).toBeGreaterThan(0)
      
      // Find user message
      const userMessage = Array.from(streamingMessage.streamingMessages.value.values())
        .find(msg => msg.role === 'user')
      
      expect(userMessage).toBeDefined()
      expect(userMessage?.content).toBe(userContent)
      expect(userMessage?.isComplete).toBe(true) // User messages are immediately complete
      expect(userMessage?.role).toBe('user')
    })

    it('should create unique IDs for user messages', async () => {
      // Act - Send two messages
      await streamingMessage.sendStreamingMessage('chat-1', 'Message 1')
      await streamingMessage.sendStreamingMessage('chat-1', 'Message 2')

      // Assert
      const messages = Array.from(streamingMessage.streamingMessages.value.values())
        .filter(msg => msg.role === 'user')
      
      expect(messages).toHaveLength(2)
      expect(messages[0].id).not.toBe(messages[1].id)
    })

    it('should maintain user message even when assistant streaming starts', async () => {
      // Setup
      const userContent = 'Test question'
      
      // Act - Send user message
      await streamingMessage.sendStreamingMessage('chat-123', userContent)
      
      // Simulate assistant response streaming
      messageHandler({
        type: 'chunk',
        data: { message_uuid: 'assistant-123', content: 'Hello', role: 'assistant' }
      })

      // Assert - Both user and assistant messages should exist
      const allMessages = Array.from(streamingMessage.streamingMessages.value.values())
      const userMessages = allMessages.filter(msg => msg.role === 'user')
      const assistantMessages = allMessages.filter(msg => msg.role === 'assistant')

      expect(userMessages).toHaveLength(1)
      expect(assistantMessages).toHaveLength(1)
      expect(userMessages[0].content).toBe(userContent)
    })
  })

  describe('Streaming State Management', () => {
    it('should properly track streaming state during the full cycle', async () => {
      // Initial state
      expect(streamingMessage.isStreaming.value).toBe(false)
      expect(streamingMessage.currentStreamId.value).toBeNull()

      // Start streaming
      await streamingMessage.sendStreamingMessage('chat-123', 'Hello')
      
      expect(streamingMessage.isStreaming.value).toBe(true)

      // Simulate assistant response
      messageHandler({
        type: 'chunk',
        data: { message_uuid: 'assistant-123', content: 'Hi', role: 'assistant' }
      })

      expect(streamingMessage.currentStreamId.value).toBe('assistant-123')

      // Complete streaming
      messageHandler({
        type: 'done',
        data: null
      })

      expect(streamingMessage.isStreaming.value).toBe(false)
      expect(streamingMessage.currentStreamId.value).toBeNull()
    })

    it('should handle streaming errors gracefully', async () => {
      // Start streaming
      await streamingMessage.sendStreamingMessage('chat-123', 'Hello')
      
      // Simulate error
      messageHandler({
        type: 'error',
        data: { message: 'Connection failed' }
      })

      expect(streamingMessage.isStreaming.value).toBe(false)
      expect(streamingMessage.currentStreamId.value).toBeNull()
    })
  })

  describe('Message Content Handling', () => {
    it('should properly accumulate streaming chunks', async () => {
      // Start streaming
      await streamingMessage.sendStreamingMessage('chat-123', 'Tell me a story')

      // Simulate chunked response
      messageHandler({
        type: 'chunk',
        data: { message_uuid: 'story-123', content: 'Once upon', role: 'assistant' }
      })

      messageHandler({
        type: 'chunk',
        data: { message_uuid: 'story-123', content: ' a time', role: 'assistant' }
      })

      messageHandler({
        type: 'chunk',
        data: { message_uuid: 'story-123', content: ' there was', role: 'assistant' }
      })

      // Assert content accumulation
      const assistantMessage = streamingMessage.streamingMessages.value.get('story-123')
      expect(assistantMessage?.content).toBe('Once upon a time there was')
      expect(assistantMessage?.isComplete).toBe(false)

      // Complete the message
      messageHandler({
        type: 'final',
        data: { message_uuid: 'story-123', content: 'Once upon a time there was a princess.' }
      })

      expect(assistantMessage?.content).toBe('Once upon a time there was a princess.')
      expect(assistantMessage?.isComplete).toBe(true)
    })

    it('should handle different chunk data formats', async () => {
      await streamingMessage.sendStreamingMessage('chat-123', 'Hello')

      // Test different possible data formats from backend
      const testCases = [
        { message_uuid: 'test-1', content: 'Hello', role: 'assistant' },
        { message_id: 'test-2', chunk: 'World', role: 'assistant' },
        { message_uuid: 'test-3', text: '!', role: 'assistant' }
      ]

      testCases.forEach((data, index) => {
        messageHandler({
          type: 'chunk',
          data
        })
      })

      // Should handle all formats
      expect(streamingMessage.streamingMessages.value.size).toBeGreaterThan(1)
    })
  })

  describe('Integration with SSE', () => {
    it('should call useServerSentEvents methods correctly', async () => {
      const chatUuid = 'integration-test'
      const content = 'Integration test message'
      const parentUuid = 'parent-456'
      const modelId = 'claude-3'

      await streamingMessage.sendStreamingMessage(chatUuid, content, parentUuid, modelId)

      // Should initialize SSE
      expect(mockConnect).toHaveBeenCalledWith(chatUuid, {
        content,
        parent_message_uuid: parentUuid,
        model_id: modelId
      })

      // Should send stream message
      expect(mockSendStreamMessage).toHaveBeenCalledWith(chatUuid, {
        content,
        parent_message_uuid: parentUuid,
        model_id: modelId
      })

      // Should set up message handler
      expect(mockOnMessage).toHaveBeenCalled()
    })
  })
})