import { describe, it, expect } from 'vitest'
import { mergeMessagesWithoutDuplication, isUserMessageDuplicated } from '../messageDeduplication'
import type { StreamingMessage } from '../../composables/useStreamingMessage'
import type { HistoryMessage } from '../../types/api'

describe('Message Deduplication Logic', () => {
  describe('mergeMessagesWithoutDuplication', () => {
    it('should not duplicate user messages when they exist in both sources', () => {
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'user-1',
          role: 'user',
          content: 'Hello AI'
        },
        {
          message_uuid: 'assistant-1',
          role: 'assistant',
          content: 'Hi there!'
        }
      ]

      const streamingMessages = new Map<string, StreamingMessage>()
      streamingMessages.set('user-1', {
        id: 'user-1',
        role: 'user',
        content: 'Hello AI', // Same as existing
        isComplete: true,
        timestamp: Date.now()
      })

      const result = mergeMessagesWithoutDuplication(existingMessages, streamingMessages)

      // Should only have one user message total
      const allUserMessages = [
        ...result.displayMessages.filter(m => m.role === 'user'),
        ...result.streamingOnlyMessages.filter(m => m.role === 'user')
      ]

      expect(allUserMessages).toHaveLength(1)
      expect(allUserMessages[0].content).toBe('Hello AI')
    })

    it('should show user message from streaming when not in existing', () => {
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'assistant-1',
          role: 'assistant',
          content: 'Previous response'
        }
      ]

      const streamingMessages = new Map<string, StreamingMessage>()
      streamingMessages.set('user-new', {
        id: 'user-new',
        role: 'user',
        content: 'New message',
        isComplete: true,
        timestamp: Date.now()
      })

      const result = mergeMessagesWithoutDuplication(existingMessages, streamingMessages)

      // Should show the streaming user message
      expect(result.streamingOnlyMessages.filter(m => m.role === 'user')).toHaveLength(1)
      expect(result.streamingOnlyMessages[0].content).toBe('New message')
    })

    it('should handle multiple user messages without duplication', () => {
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'user-1',
          role: 'user',
          content: 'First message'
        },
        {
          message_uuid: 'assistant-1',
          role: 'assistant',
          content: 'First response'
        },
        {
          message_uuid: 'user-2',
          role: 'user',
          content: 'Second message'
        }
      ]

      const streamingMessages = new Map<string, StreamingMessage>()
      // User-2 duplicate
      streamingMessages.set('user-2', {
        id: 'user-2',
        role: 'user',
        content: 'Second message',
        isComplete: true,
        timestamp: Date.now()
      })
      // New user message
      streamingMessages.set('user-3', {
        id: 'user-3',
        role: 'user',
        content: 'Third message',
        isComplete: true,
        timestamp: Date.now()
      })

      const result = mergeMessagesWithoutDuplication(existingMessages, streamingMessages)

      // Count all user messages
      const allUserMessages = [
        ...result.displayMessages.filter(m => m.role === 'user'),
        ...result.streamingOnlyMessages.filter(m => m.role === 'user')
      ]

      expect(allUserMessages).toHaveLength(3) // No duplicates

      const contents = allUserMessages.map(m => m.content)
      expect(contents).toContain('First message')
      expect(contents).toContain('Second message')
      expect(contents).toContain('Third message')

      // Should not have duplicate "Second message"
      const secondMessageCount = contents.filter(c => c === 'Second message').length
      expect(secondMessageCount).toBe(1)
    })

    it('should preserve assistant messages from both sources', () => {
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'assistant-1',
          role: 'assistant',
          content: 'Previous response'
        }
      ]

      const streamingMessages = new Map<string, StreamingMessage>()
      streamingMessages.set('assistant-2', {
        id: 'assistant-2',
        role: 'assistant',
        content: 'Streaming response...',
        isComplete: false,
        timestamp: Date.now()
      })

      const result = mergeMessagesWithoutDuplication(existingMessages, streamingMessages)

      // Should show both assistant messages
      expect(result.displayMessages.filter(m => m.role === 'assistant')).toHaveLength(1)
      expect(result.streamingOnlyMessages.filter(m => m.role === 'assistant')).toHaveLength(1)
    })

    it('should handle content-based deduplication for same content different IDs', () => {
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'user-original',
          role: 'user',
          content: 'Hello'
        }
      ]

      const streamingMessages = new Map<string, StreamingMessage>()
      streamingMessages.set('user-duplicate', {
        id: 'user-duplicate',
        role: 'user',
        content: 'Hello', // Same content, different ID
        isComplete: true,
        timestamp: Date.now()
      })

      const result = mergeMessagesWithoutDuplication(existingMessages, streamingMessages)

      // Should deduplicate by content
      const allUserMessages = [
        ...result.displayMessages.filter(m => m.role === 'user'),
        ...result.streamingOnlyMessages.filter(m => m.role === 'user')
      ]

      expect(allUserMessages).toHaveLength(1)
      expect(allUserMessages[0].content).toBe('Hello')
    })

    it('should handle empty streaming messages', () => {
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'user-1',
          role: 'user',
          content: 'Message'
        }
      ]

      const streamingMessages = new Map<string, StreamingMessage>()

      const result = mergeMessagesWithoutDuplication(existingMessages, streamingMessages)

      expect(result.displayMessages).toHaveLength(1)
      expect(result.streamingOnlyMessages).toHaveLength(0)
    })

    it('should handle empty existing messages', () => {
      const existingMessages: HistoryMessage[] = []

      const streamingMessages = new Map<string, StreamingMessage>()
      streamingMessages.set('user-1', {
        id: 'user-1',
        role: 'user',
        content: 'New message',
        isComplete: true,
        timestamp: Date.now()
      })

      const result = mergeMessagesWithoutDuplication(existingMessages, streamingMessages)

      expect(result.displayMessages).toHaveLength(0)
      expect(result.streamingOnlyMessages).toHaveLength(1)
    })
  })

  describe('isUserMessageDuplicated', () => {
    it('should detect ID-based duplication', () => {
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'user-1',
          role: 'user',
          content: 'Hello'
        }
      ]

      const streamingMessage: StreamingMessage = {
        id: 'user-1', // Same ID
        role: 'user',
        content: 'Different content',
        isComplete: true,
        timestamp: Date.now()
      }

      expect(isUserMessageDuplicated(streamingMessage, existingMessages)).toBe(true)
    })

    it('should detect content-based duplication', () => {
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'user-original',
          role: 'user',
          content: 'Hello'
        }
      ]

      const streamingMessage: StreamingMessage = {
        id: 'user-different', // Different ID
        role: 'user',
        content: 'Hello', // Same content
        isComplete: true,
        timestamp: Date.now()
      }

      expect(isUserMessageDuplicated(streamingMessage, existingMessages)).toBe(true)
    })

    it('should not flag non-user messages as duplicated', () => {
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'assistant-1',
          role: 'assistant',
          content: 'Hello'
        }
      ]

      const streamingMessage: StreamingMessage = {
        id: 'assistant-1', // Same ID but assistant role
        role: 'assistant',
        content: 'Hello',
        isComplete: true,
        timestamp: Date.now()
      }

      expect(isUserMessageDuplicated(streamingMessage, existingMessages)).toBe(false)
    })

    it('should not flag unique user messages as duplicated', () => {
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'user-1',
          role: 'user',
          content: 'Hello'
        }
      ]

      const streamingMessage: StreamingMessage = {
        id: 'user-2',
        role: 'user',
        content: 'Different message',
        isComplete: true,
        timestamp: Date.now()
      }

      expect(isUserMessageDuplicated(streamingMessage, existingMessages)).toBe(false)
    })
  })
})