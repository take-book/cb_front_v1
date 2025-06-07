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

describe('MessageStream - Duplication Issue', () => {
  let wrapper: any

  beforeEach(() => {
    // Clear any previous instances
    wrapper = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Streaming Message Duplication Problem', () => {
    it('should NOT create multiple message elements for the same streaming message ID', async () => {
      const messages: HistoryMessage[] = []
      
      // Create streaming messages map with chunks that should accumulate
      const streamingMessages = new Map<string, StreamingMessage>()
      
      // Initial mount with empty streaming messages
      wrapper = mount(MessageStream, {
        props: {
          messages,
          streamingMessages: streamingMessages,
          selectedMessageUuid: null,
          isBranchingMode: false
        }
      })

      // Simulate first chunk
      const assistantId = 'assistant-123'
      streamingMessages.set(assistantId, {
        id: assistantId,
        role: 'assistant',
        content: 'こ',
        isComplete: false,
        timestamp: Date.now()
      })

      // Update props to trigger re-render
      await wrapper.setProps({ streamingMessages: new Map(streamingMessages) })
      await nextTick()

      // Should have 1 streaming message element
      let streamingElements = wrapper.findAll('[data-message-id="assistant-123"]')
      expect(streamingElements).toHaveLength(1)
      expect(streamingElements[0].text()).toBe('こ')

      // Simulate second chunk (should update existing, not create new)
      streamingMessages.set(assistantId, {
        id: assistantId,
        role: 'assistant',
        content: 'こん',
        isComplete: false,
        timestamp: Date.now()
      })

      await wrapper.setProps({ streamingMessages: new Map(streamingMessages) })
      await nextTick()

      // Should STILL have only 1 element, but with updated content
      streamingElements = wrapper.findAll('[data-message-id="assistant-123"]')
      expect(streamingElements).toHaveLength(1)
      expect(streamingElements[0].text()).toBe('こん')

      // Third chunk
      streamingMessages.set(assistantId, {
        id: assistantId,
        role: 'assistant',
        content: 'こんに',
        isComplete: false,
        timestamp: Date.now()
      })

      await wrapper.setProps({ streamingMessages: new Map(streamingMessages) })
      await nextTick()

      streamingElements = wrapper.findAll('[data-message-id="assistant-123"]')
      expect(streamingElements).toHaveLength(1)
      expect(streamingElements[0].text()).toBe('こんに')

      // Final chunk
      streamingMessages.set(assistantId, {
        id: assistantId,
        role: 'assistant',
        content: 'こんにちは',
        isComplete: true,
        timestamp: Date.now()
      })

      await wrapper.setProps({ streamingMessages: new Map(streamingMessages) })
      await nextTick()

      streamingElements = wrapper.findAll('[data-message-id="assistant-123"]')
      expect(streamingElements).toHaveLength(1)
      expect(streamingElements[0].text()).toBe('こんにちは')
    })

    it('should reproduce the duplication problem if Map reference is not updated', async () => {
      const messages: HistoryMessage[] = []
      const streamingMessages = new Map<string, StreamingMessage>()
      
      wrapper = mount(MessageStream, {
        props: {
          messages,
          streamingMessages,
          selectedMessageUuid: null,
          isBranchingMode: false
        }
      })

      const assistantId = 'assistant-456'

      // First chunk
      streamingMessages.set(assistantId, {
        id: assistantId,
        role: 'assistant',
        content: 'Hello',
        isComplete: false,
        timestamp: Date.now()
      })

      // DON'T create new Map reference - this might cause Vue reactivity issues
      await wrapper.setProps({ streamingMessages })
      await nextTick()

      let streamingElements = wrapper.findAll('[data-message-id="assistant-456"]')
      expect(streamingElements).toHaveLength(1)

      // Second chunk - still using same Map reference
      streamingMessages.set(assistantId, {
        id: assistantId,
        role: 'assistant',
        content: 'Hello World',
        isComplete: false,
        timestamp: Date.now()
      })

      await wrapper.setProps({ streamingMessages })
      await nextTick()

      streamingElements = wrapper.findAll('[data-message-id="assistant-456"]')
      // This test verifies current behavior - it might pass even with bugs
      expect(streamingElements).toHaveLength(1)
    })

    it('should handle multiple different streaming messages correctly', async () => {
      const messages: HistoryMessage[] = []
      const streamingMessages = new Map<string, StreamingMessage>()
      
      wrapper = mount(MessageStream, {
        props: {
          messages,
          streamingMessages,
          selectedMessageUuid: null,
          isBranchingMode: false
        }
      })

      // Add user message
      streamingMessages.set('user-1', {
        id: 'user-1',
        role: 'user',
        content: 'Hello AI',
        isComplete: true,
        timestamp: Date.now()
      })

      // Add assistant message
      streamingMessages.set('assistant-1', {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Hi there',
        isComplete: false,
        timestamp: Date.now()
      })

      await wrapper.setProps({ streamingMessages: new Map(streamingMessages) })
      await nextTick()

      // Should have exactly 2 message elements
      const userElements = wrapper.findAll('.bg-blue-600') // User message style
      const assistantElements = wrapper.findAll('[data-message-id="assistant-1"]')
      
      expect(userElements).toHaveLength(1)
      expect(assistantElements).toHaveLength(1)
      expect(userElements[0].text()).toContain('Hello AI')
      expect(assistantElements[0].text()).toBe('Hi there')
    })

    it('should not display both streamingMessages and fallback streamingMessage', async () => {
      const messages: HistoryMessage[] = []
      const streamingMessages = new Map<string, StreamingMessage>()
      
      // Add a streaming message to the map
      streamingMessages.set('assistant-fallback', {
        id: 'assistant-fallback',
        role: 'assistant',
        content: 'From map',
        isComplete: false,
        timestamp: Date.now()
      })

      // Also provide a fallback streaming message
      const fallbackMessage: StreamingMessage = {
        id: 'fallback-single',
        role: 'assistant',
        content: 'From fallback',
        isComplete: false,
        timestamp: Date.now()
      }

      wrapper = mount(MessageStream, {
        props: {
          messages,
          streamingMessages,
          streamingMessage: fallbackMessage,
          selectedMessageUuid: null,
          isBranchingMode: false
        }
      })

      await nextTick()

      // Should only show streamingMessages, not the fallback
      const mapMessage = wrapper.findAll('[data-message-id="assistant-fallback"]')
      const fallbackElements = wrapper.findAll('[data-message-id="fallback-single"]')
      
      expect(mapMessage).toHaveLength(1)
      expect(fallbackElements).toHaveLength(0) // Fallback should not be shown
      expect(mapMessage[0].text()).toBe('From map')
    })
  })
})