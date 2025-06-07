import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useStreamingMessage } from '../useStreamingMessage'
import type { SSEMessage } from '../useServerSentEvents'

// Mock useServerSentEvents
const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockSendStreamMessage = vi.fn()
let currentMessageHandler: ((message: SSEMessage) => void) | null = null
const mockOnMessage = vi.fn().mockImplementation((handler) => {
  currentMessageHandler = handler
})

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

describe('useStreamingMessage - Chunk Accumulation Fix', () => {
  let streamingMessage: ReturnType<typeof useStreamingMessage>

  beforeEach(() => {
    vi.clearAllMocks()
    currentMessageHandler = null
    streamingMessage = useStreamingMessage()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Message Chunk Accumulation', () => {
    it('should accumulate chunks correctly without creating duplicate messages', async () => {
      // Send user message first
      await streamingMessage.sendStreamingMessage('chat-123', 'Hello AI')

      // Simulate receiving chunks with consistent message ID
      const assistantMessageId = 'assistant-response-123'

      // First chunk
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          message_uuid: assistantMessageId, 
          content: 'こ',
          role: 'assistant'
        }
      })

      // Verify first chunk creates the message
      expect(streamingMessage.streamingMessages.value.size).toBe(2) // user + assistant
      let assistantMsg = streamingMessage.streamingMessages.value.get(assistantMessageId)
      expect(assistantMsg?.content).toBe('こ')
      expect(assistantMsg?.isComplete).toBe(false)

      // Second chunk
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          message_uuid: assistantMessageId, 
          content: 'ん',
          role: 'assistant'
        }
      })

      // Should still be only 2 messages total, with accumulated content
      expect(streamingMessage.streamingMessages.value.size).toBe(2)
      assistantMsg = streamingMessage.streamingMessages.value.get(assistantMessageId)
      expect(assistantMsg?.content).toBe('こん')

      // Third chunk
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          message_uuid: assistantMessageId, 
          content: 'に',
          role: 'assistant'
        }
      })

      expect(streamingMessage.streamingMessages.value.size).toBe(2)
      assistantMsg = streamingMessage.streamingMessages.value.get(assistantMessageId)
      expect(assistantMsg?.content).toBe('こんに')

      // Final chunk
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          message_uuid: assistantMessageId, 
          content: 'ちは',
          role: 'assistant'
        }
      })

      expect(streamingMessage.streamingMessages.value.size).toBe(2)
      assistantMsg = streamingMessage.streamingMessages.value.get(assistantMessageId)
      expect(assistantMsg?.content).toBe('こんにちは')
    })

    it('should handle missing message_uuid by using consistent fallback', async () => {
      await streamingMessage.sendStreamingMessage('chat-123', 'Test')

      // First chunk without message_uuid
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          content: 'Hello',
          role: 'assistant'
        }
      })

      // Should create a message with fallback ID
      expect(streamingMessage.streamingMessages.value.size).toBe(2) // user + assistant

      // Second chunk without message_uuid
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          content: ' World',
          role: 'assistant'
        }
      })

      // Should still be only 2 messages, with accumulated content
      expect(streamingMessage.streamingMessages.value.size).toBe(2)
      
      // Find the assistant message (should have fallback ID)
      const assistantMessages = Array.from(streamingMessage.streamingMessages.value.values())
        .filter(msg => msg.role === 'assistant')
      
      expect(assistantMessages).toHaveLength(1)
      expect(assistantMessages[0].content).toBe('Hello World')
    })

    it('should handle mixed message IDs correctly', async () => {
      await streamingMessage.sendStreamingMessage('chat-123', 'Multi test')

      // First chunk with message_uuid
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          message_uuid: 'msg-1', 
          content: 'Message 1: ',
          role: 'assistant'
        }
      })

      // Second chunk with different message_uuid (should create new message)
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          message_uuid: 'msg-2', 
          content: 'Message 2: ',
          role: 'assistant'
        }
      })

      // Should have 3 messages total: user + 2 assistant messages
      expect(streamingMessage.streamingMessages.value.size).toBe(3)

      // Continue first message
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          message_uuid: 'msg-1', 
          content: 'Part A',
          role: 'assistant'
        }
      })

      expect(streamingMessage.streamingMessages.value.size).toBe(3)
      expect(streamingMessage.streamingMessages.value.get('msg-1')?.content).toBe('Message 1: Part A')
      expect(streamingMessage.streamingMessages.value.get('msg-2')?.content).toBe('Message 2: ')
    })

    it('should handle final message completion correctly', async () => {
      await streamingMessage.sendStreamingMessage('chat-123', 'Final test')

      const assistantId = 'final-msg-123'

      // Send chunks
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          message_uuid: assistantId, 
          content: 'Partial ',
          role: 'assistant'
        }
      })

      currentMessageHandler!({
        type: 'chunk',
        data: { 
          message_uuid: assistantId, 
          content: 'message',
          role: 'assistant'
        }
      })

      // Message should be incomplete
      let assistantMsg = streamingMessage.streamingMessages.value.get(assistantId)
      expect(assistantMsg?.content).toBe('Partial message')
      expect(assistantMsg?.isComplete).toBe(false)

      // Send final completion
      currentMessageHandler!({
        type: 'final',
        data: { 
          message_uuid: assistantId,
          content: 'Partial message complete!',
          role: 'assistant'
        }
      })

      // Should replace content and mark complete
      assistantMsg = streamingMessage.streamingMessages.value.get(assistantId)
      expect(assistantMsg?.content).toBe('Partial message complete!')
      expect(assistantMsg?.isComplete).toBe(true)
    })

    it('should not create new messages for the same session without proper ID', async () => {
      await streamingMessage.sendStreamingMessage('chat-123', 'Session test')

      // Start streaming without message_uuid
      currentMessageHandler!({
        type: 'chunk',
        data: { 
          content: 'Start',
          role: 'assistant'
        }
      })

      const initialCount = streamingMessage.streamingMessages.value.size

      // Continue streaming without message_uuid
      for (let i = 0; i < 10; i++) {
        currentMessageHandler!({
          type: 'chunk',
          data: { 
            content: ` ${i}`,
            role: 'assistant'
          }
        })
      }

      // Should still have the same number of messages
      expect(streamingMessage.streamingMessages.value.size).toBe(initialCount)

      // Find assistant message
      const assistantMsg = Array.from(streamingMessage.streamingMessages.value.values())
        .find(msg => msg.role === 'assistant')

      expect(assistantMsg?.content).toBe('Start 0 1 2 3 4 5 6 7 8 9')
    })
  })
})