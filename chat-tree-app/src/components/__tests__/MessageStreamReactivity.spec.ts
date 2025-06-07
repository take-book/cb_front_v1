import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import type { StreamingMessage } from '../../composables/useStreamingMessage'

describe('MessageStream Reactivity Fix', () => {
  let streamingMessages: any

  beforeEach(() => {
    streamingMessages = ref(new Map<string, StreamingMessage>())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Map Reactivity with New References', () => {
    it('should trigger reactivity when Map reference is updated', async () => {
      const assistantId = 'assistant-123'
      
      // Initial message
      const newMap1 = new Map(streamingMessages.value)
      newMap1.set(assistantId, {
        id: assistantId,
        role: 'assistant',
        content: 'こ',
        isComplete: false,
        timestamp: Date.now()
      })
      streamingMessages.value = newMap1
      
      await nextTick()
      
      // Verify first chunk
      expect(streamingMessages.value.size).toBe(1)
      expect(streamingMessages.value.get(assistantId)?.content).toBe('こ')
      
      // Update with accumulated content
      const existing = streamingMessages.value.get(assistantId)!
      const newMap2 = new Map(streamingMessages.value)
      newMap2.set(assistantId, {
        ...existing,
        content: existing.content + 'ん'
      })
      streamingMessages.value = newMap2
      
      await nextTick()
      
      // Should have accumulated content, not duplicate messages
      expect(streamingMessages.value.size).toBe(1)
      expect(streamingMessages.value.get(assistantId)?.content).toBe('こん')
      
      // Third update
      const existing2 = streamingMessages.value.get(assistantId)!
      const newMap3 = new Map(streamingMessages.value)
      newMap3.set(assistantId, {
        ...existing2,
        content: existing2.content + 'にちは'
      })
      streamingMessages.value = newMap3
      
      await nextTick()
      
      // Final verification
      expect(streamingMessages.value.size).toBe(1)
      expect(streamingMessages.value.get(assistantId)?.content).toBe('こんにちは')
    })

    it('should handle user and assistant messages together', async () => {
      // Add user message
      const userMap = new Map(streamingMessages.value)
      userMap.set('user-1', {
        id: 'user-1',
        role: 'user',
        content: 'Hello AI',
        isComplete: true,
        timestamp: Date.now()
      })
      streamingMessages.value = userMap
      
      await nextTick()
      
      // Add assistant streaming message
      const assistantMap = new Map(streamingMessages.value)
      assistantMap.set('assistant-1', {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Hi',
        isComplete: false,
        timestamp: Date.now()
      })
      streamingMessages.value = assistantMap
      
      await nextTick()
      
      // Update assistant message
      const existing = streamingMessages.value.get('assistant-1')!
      const updateMap = new Map(streamingMessages.value)
      updateMap.set('assistant-1', {
        ...existing,
        content: existing.content + ' there!'
      })
      streamingMessages.value = updateMap
      
      await nextTick()
      
      // Should have 2 messages total
      expect(streamingMessages.value.size).toBe(2)
      expect(streamingMessages.value.get('user-1')?.content).toBe('Hello AI')
      expect(streamingMessages.value.get('assistant-1')?.content).toBe('Hi there!')
    })

    it('should demonstrate the difference between direct mutation and new reference', async () => {
      const assistantId = 'test-mutation'
      
      // Create initial message with new reference (correct approach)
      const newMap = new Map(streamingMessages.value)
      newMap.set(assistantId, {
        id: assistantId,
        role: 'assistant',
        content: 'Start',
        isComplete: false,
        timestamp: Date.now()
      })
      streamingMessages.value = newMap
      
      const initialSize = streamingMessages.value.size
      
      // Update with new reference (should work)
      const existing = streamingMessages.value.get(assistantId)!
      const updateMap = new Map(streamingMessages.value)
      updateMap.set(assistantId, {
        ...existing,
        content: existing.content + ' Updated'
      })
      streamingMessages.value = updateMap
      
      await nextTick()
      
      // Should maintain same size with updated content
      expect(streamingMessages.value.size).toBe(initialSize)
      expect(streamingMessages.value.get(assistantId)?.content).toBe('Start Updated')
    })
  })
})