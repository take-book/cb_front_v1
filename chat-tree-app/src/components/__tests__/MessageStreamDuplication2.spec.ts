import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import MessageStream from '../MessageStream.vue'
import type { StreamingMessage } from '../../composables/useStreamingMessage'
import type { HistoryMessage } from '../../types/api'

// Mock MarkdownContent component
vi.mock('../MarkdownContent.vue', () => ({
  default: {
    name: 'MarkdownContent',
    props: ['content'],
    template: '<div class="markdown-content">{{ content }}</div>'
  }
}))

// Mock StreamingMessage component  
vi.mock('../StreamingMessage.vue', () => ({
  default: {
    name: 'StreamingMessage',
    props: ['message'],
    template: '<div class="streaming-message" :data-message-id="message.id">{{ message.content }}</div>'
  }
}))

describe('MessageStream - User Message Duplication Issue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('User Message Duplication Prevention', () => {
    it('should NOT display duplicate user messages when both existing and streaming are present', async () => {
      // Scenario: User sends message, it gets added to streamingMessages immediately,
      // then after streaming completion, it becomes part of existing messages
      
      // Existing messages (from chat reload after streaming completion)
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

      // Streaming messages (user message still lingering in streamingMessages)
      const streamingMessages = new Map<string, StreamingMessage>()
      streamingMessages.set('user-1', {
        id: 'user-1',
        role: 'user',
        content: 'Hello AI', // Same content as existing message
        isComplete: true,
        timestamp: Date.now()
      })

      wrapper = mount(MessageStream, {
        props: {
          messages: existingMessages,
          streamingMessages: streamingMessages,
          selectedMessageUuid: null,
          isBranchingMode: false
        }
      })

      await nextTick()

      // Should only show the user message ONCE, not twice
      const userMessageElements = wrapper.findAll('.bg-blue-600') // User message style
      expect(userMessageElements).toHaveLength(1)

      // Check that the content is not duplicated
      const allUserTexts = userMessageElements.map((el: any) => el.text())
      const uniqueUserTexts = [...new Set(allUserTexts)]
      expect(allUserTexts).toHaveLength(uniqueUserTexts.length)
    })

    it('should display user message from streamingMessages when not in existing messages', async () => {
      // Scenario: User just sent message, only in streamingMessages, not yet in existing
      
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

      wrapper = mount(MessageStream, {
        props: {
          messages: existingMessages,
          streamingMessages: streamingMessages,
          selectedMessageUuid: null,
          isBranchingMode: false
        }
      })

      await nextTick()

      // Should show the user message from streamingMessages
      const userMessageElements = wrapper.findAll('.bg-blue-600')
      expect(userMessageElements).toHaveLength(1)
      expect(userMessageElements[0].text()).toContain('New message')
    })

    it('should display user message from existing when not in streamingMessages', async () => {
      // Scenario: Normal case, user message only in existing messages
      
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'user-1',
          role: 'user',
          content: 'Existing message'
        },
        {
          message_uuid: 'assistant-1',
          role: 'assistant',
          content: 'Response'
        }
      ]

      const streamingMessages = new Map<string, StreamingMessage>()
      // Only assistant streaming
      streamingMessages.set('assistant-new', {
        id: 'assistant-new',
        role: 'assistant',
        content: 'Streaming response...',
        isComplete: false,
        timestamp: Date.now()
      })

      wrapper = mount(MessageStream, {
        props: {
          messages: existingMessages,
          streamingMessages: streamingMessages,
          selectedMessageUuid: null,
          isBranchingMode: false
        }
      })

      await nextTick()

      // Should show the user message from existing messages
      const userMessageElements = wrapper.findAll('.bg-blue-600')
      expect(userMessageElements).toHaveLength(1)
      expect(userMessageElements[0].text()).toContain('Existing message')
    })

    it('should handle multiple user messages without duplication', async () => {
      // Complex scenario with multiple user messages
      
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
      // User-2 also exists in streaming (duplication scenario)
      streamingMessages.set('user-2', {
        id: 'user-2',
        role: 'user',
        content: 'Second message', // Duplicate
        isComplete: true,
        timestamp: Date.now()
      })
      // New user message only in streaming
      streamingMessages.set('user-3', {
        id: 'user-3',
        role: 'user',
        content: 'Third message',
        isComplete: true,
        timestamp: Date.now()
      })

      wrapper = mount(MessageStream, {
        props: {
          messages: existingMessages,
          streamingMessages: streamingMessages,
          selectedMessageUuid: null,
          isBranchingMode: false
        }
      })

      await nextTick()

      // Should show 3 unique user messages total (not 4)
      const userMessageElements = wrapper.findAll('.bg-blue-600')
      expect(userMessageElements).toHaveLength(3)

      const messageTexts = userMessageElements.map((el: any) => el.text())
      expect(messageTexts).toContain('First message')  // From existing
      expect(messageTexts).toContain('Second message') // Should appear only once
      expect(messageTexts).toContain('Third message')  // From streaming
    })

    it('should maintain correct message ordering', async () => {
      // Test that message order is preserved when avoiding duplicates
      
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'user-1',
          role: 'user',
          content: 'Message 1'
        },
        {
          message_uuid: 'assistant-1',
          role: 'assistant',
          content: 'Response 1'
        }
      ]

      const streamingMessages = new Map<string, StreamingMessage>()
      streamingMessages.set('user-2', {
        id: 'user-2',
        role: 'user',
        content: 'Message 2',
        isComplete: true,
        timestamp: Date.now()
      })
      streamingMessages.set('assistant-2', {
        id: 'assistant-2',
        role: 'assistant',
        content: 'Response 2...',
        isComplete: false,
        timestamp: Date.now()
      })

      wrapper = mount(MessageStream, {
        props: {
          messages: existingMessages,
          streamingMessages: streamingMessages,
          selectedMessageUuid: null,
          isBranchingMode: false
        }
      })

      await nextTick()

      // Check message ordering
      const allMessages = wrapper.findAll('[class*="flex"]').filter((el: any) => 
        el.text().includes('Message') || el.text().includes('Response')
      )

      // Should be in chronological order
      expect(allMessages[0].text()).toContain('Message 1')
      expect(allMessages[1].text()).toContain('Response 1')
      expect(allMessages[2].text()).toContain('Message 2')
      expect(allMessages[3].text()).toContain('Response 2')
    })

    it('should handle edge case with same content but different IDs', async () => {
      // Edge case: same content but different message IDs
      
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

      wrapper = mount(MessageStream, {
        props: {
          messages: existingMessages,
          streamingMessages: streamingMessages,
          selectedMessageUuid: null,
          isBranchingMode: false
        }
      })

      await nextTick()

      // Should handle this gracefully - could show both or deduplicate by content
      const userMessageElements = wrapper.findAll('.bg-blue-600')
      // This test defines expected behavior - we want content-based deduplication
      expect(userMessageElements).toHaveLength(1)
    })
  })
})