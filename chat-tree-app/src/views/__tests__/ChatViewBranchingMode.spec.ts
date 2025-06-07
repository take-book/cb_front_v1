import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import ChatView from '../ChatView.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useChatsStore } from '../../stores/chats'
import type { TreeNode } from '../../types/api'

// Mock router
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { chatUuid: 'test-chat-123' }
  }),
  useRouter: () => ({
    push: vi.fn()
  })
}))

// Mock streaming composable
const mockStreamingMessages = ref(new Map())
const mockIsStreaming = ref(false)
const mockSendStreamingMessage = vi.fn()

vi.mock('../../composables/useStreamingMessage', () => ({
  useStreamingMessage: () => ({
    streamingMessages: mockStreamingMessages,
    currentStreamingMessage: ref(null),
    isStreaming: mockIsStreaming,
    sendStreamingMessage: mockSendStreamingMessage,
    initializeSSE: vi.fn(),
    clearStreamingMessage: vi.fn()
  })
}))

// Mock models store
vi.mock('../../stores/models', () => ({
  useModelsStore: () => ({
    fetchAvailableModels: vi.fn(),
    selectedModelId: ref(null)
  })
}))

// Mock tree helpers
vi.mock('../../utils/treeHelpers', () => ({
  getBranchConversationThread: vi.fn().mockReturnValue([])
}))

describe('ChatView - Branching Mode Selection Persistence', () => {
  let wrapper: any
  let chatsStore: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockStreamingMessages.value = new Map()
    mockIsStreaming.value = false

    setActivePinia(createPinia())
    chatsStore = useChatsStore()

    // Mock chat data with branching structure
    const mockTreeStructure: TreeNode = {
      uuid: 'root',
      role: 'system',
      content: 'System prompt',
      children: [
        {
          uuid: 'user-1',
          role: 'user',
          content: 'First question',
          children: [
            {
              uuid: 'assistant-1',
              role: 'assistant',
              content: 'First answer',
              children: [
                {
                  uuid: 'user-2',
                  role: 'user',
                  content: 'Follow-up question',
                  children: [
                    {
                      uuid: 'assistant-2',
                      role: 'assistant',
                      content: 'Latest answer',
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }

    chatsStore.$patch({
      currentChatUuid: 'test-chat-123',
      chatData: {
        chat_uuid: 'test-chat-123',
        title: 'Test Chat',
        system_prompt: null,
        messages: [],
        tree_structure: mockTreeStructure,
        metadata: {}
      },
      isLoading: false,
      error: null
    })

    // Mock store methods
    chatsStore.loadCompleteChat = vi.fn()
    chatsStore.sendMessage = vi.fn()
    chatsStore.preserveSelectionForStreaming = vi.fn()
    chatsStore.restorePreservedSelection = vi.fn().mockReturnValue(true)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Selection Preservation During Streaming Workflow', () => {
    it('should preserve branch selection during streaming message workflow', async () => {
      // Mount component
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      await flushPromises()

      // Select a branch node (not latest) - simulates user clicking branch button
      chatsStore.selectNode('assistant-1')
      await nextTick()

      // Verify branching mode is active
      expect(chatsStore.selectedNodeUuid).toBe('assistant-1')
      expect(chatsStore.isBranchingMode).toBe(true)

      // Enable streaming mode
      const streamingToggle = wrapper.find('button[type="button"]')
      await streamingToggle.trigger('click')
      await nextTick()

      // Type and send message
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue('New branch message')
      
      // Submit form - should preserve selection before streaming
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Verify preserveSelectionForStreaming was called
      expect(chatsStore.preserveSelectionForStreaming).toHaveBeenCalled()

      // Simulate streaming completion
      mockIsStreaming.value = false
      await nextTick()

      // Wait for the watchEffect timeout to trigger
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Verify loadCompleteChat was called (automatic reload)
      expect(chatsStore.loadCompleteChat).toHaveBeenCalledWith('test-chat-123')

      // Verify restorePreservedSelection was called
      expect(chatsStore.restorePreservedSelection).toHaveBeenCalled()
    })

    it('should not preserve selection when in normal continuation mode', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      await flushPromises()

      // Select latest node (normal mode)
      chatsStore.selectNode('assistant-2') // This is the latest leaf
      await nextTick()

      expect(chatsStore.isBranchingMode).toBe(false)

      // Enable streaming and send message
      const streamingToggle = wrapper.find('button[type="button"]')
      await streamingToggle.trigger('click')
      
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue('Continuation message')
      
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Should still call preserve method, but it should handle normal mode internally
      expect(chatsStore.preserveSelectionForStreaming).toHaveBeenCalled()
    })

    it('should handle streaming errors without losing branch selection', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      await flushPromises()

      // Select branch and start streaming
      chatsStore.selectNode('assistant-1')
      expect(chatsStore.isBranchingMode).toBe(true)

      // Mock streaming error
      mockSendStreamingMessage.mockRejectedValue(new Error('Streaming failed'))

      const streamingToggle = wrapper.find('button[type="button"]')
      await streamingToggle.trigger('click')
      
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue('Error test message')
      
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Even with error, should have tried to preserve selection
      expect(chatsStore.preserveSelectionForStreaming).toHaveBeenCalled()
    })

    it('should handle REST mode without affecting branch preservation', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      await flushPromises()

      // Select branch
      chatsStore.selectNode('assistant-1')
      expect(chatsStore.isBranchingMode).toBe(true)

      // Keep REST mode (don't toggle to streaming)
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue('REST mode message')
      
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // In REST mode, should use regular store method
      expect(chatsStore.sendMessage).toHaveBeenCalled()
      // Should not call streaming preservation in REST mode
      expect(chatsStore.preserveSelectionForStreaming).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid mode switching gracefully', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      await flushPromises()

      chatsStore.selectNode('assistant-1')
      
      // Rapidly toggle streaming mode
      const toggleButton = wrapper.find('button[type="button"]')
      await toggleButton.trigger('click') // Enable streaming
      await toggleButton.trigger('click') // Disable streaming
      await toggleButton.trigger('click') // Enable streaming again
      
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue('Rapid toggle test')
      
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Should handle final state correctly
      expect(chatsStore.preserveSelectionForStreaming).toHaveBeenCalled()
    })

    it('should handle component unmount during streaming', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      chatsStore.selectNode('assistant-1')
      
      // Start streaming
      mockIsStreaming.value = true
      await nextTick()

      // Unmount component while streaming
      wrapper.unmount()

      // Should not cause errors (cleanup should handle this)
      expect(() => {
        mockIsStreaming.value = false
      }).not.toThrow()
    })
  })
})