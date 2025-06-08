import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import ChatView from '../ChatView.vue'
import { createPinia, setActivePinia } from 'pinia'

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

// Mock chat stores
const mockSendMessage = vi.fn()
const mockLoadCompleteChat = vi.fn()

vi.mock('../../stores/chats', () => ({
  useChatDetailStore: () => ({
    currentChatUuid: ref('test-chat-123'),
    chatData: ref({
      chat_uuid: 'test-chat-123',
      title: 'Test Chat',
      messages: [],
      tree_structure: null
    }),
    isLoading: ref(false),
    error: ref(null),
    selectedNodeUuid: ref(null),
    isBranchingMode: ref(false),
    loadCompleteChat: mockLoadCompleteChat
  })
}))

// Mock chat streaming
vi.mock('../../composables/useChatStreaming', () => ({
  useChatStreaming: () => ({
    useStreaming: ref(true),
    currentStreamingMessage: ref(null),
    streamingMessages: mockStreamingMessages,
    sendMessage: mockSendMessage
  })
}))

// Mock chat coordination
vi.mock('../../composables/useChatCoordination', () => ({
  useChatCoordination: () => ({
    chatUuid: ref('test-chat-123'),
    selectedModelId: ref('gpt-4'),
    filteredConversationMessages: ref([]),
    isLoading: ref(false),
    error: ref(null),
    chatTitle: ref('Test Chat'),
    messages: ref([]),
    treeStructure: ref(null),
    selectedNodeUuid: ref(null),
    currentPath: ref([]),
    showSystemMessages: ref(true),
    isBranchingMode: ref(false),
    handleNodeClick: vi.fn(),
    handleMessageSelect: vi.fn(),
    handleModelSelected: vi.fn(),
    handleClearSelection: vi.fn(),
    handleToggleSystemMessages: vi.fn()
  })
}))

describe('ChatView - Message Clearing Fix', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockStreamingMessages.value = new Map()
    mockIsStreaming.value = false
    setActivePinia(createPinia())
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Message Input Clearing Behavior', () => {
    it('should clear message on successful send', async () => {
      // Mock successful send
      mockSendMessage.mockResolvedValue({ success: true })

      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            ChatPanelLayout: {
              template: `
                <div>
                  <slot name="input"></slot>
                </div>
              `
            }
          }
        }
      })

      await flushPromises()

      // Type a message
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue('Test successful message')
      
      // Verify message is set
      expect(wrapper.vm.newMessage).toBe('Test successful message')

      // Submit the message
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Verify message was cleared
      expect(wrapper.vm.newMessage).toBe('')
    })

    it('should clear message on handled error (sendMessage returns null)', async () => {
      // Mock handled error (returns null)
      mockSendMessage.mockResolvedValue(null)

      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            ChatPanelLayout: {
              template: `
                <div>
                  <slot name="input"></slot>
                </div>
              `
            }
          }
        }
      })

      await flushPromises()

      // Type a message
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue('Test handled error message')
      
      // Submit the message
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Verify message was cleared (not restored for handled errors)
      expect(wrapper.vm.newMessage).toBe('')
    })

    it('should restore message on unhandled error (sendMessage throws)', async () => {
      // Mock unhandled error (throws exception)
      mockSendMessage.mockRejectedValue(new Error('Authentication required'))

      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            ChatPanelLayout: {
              template: `
                <div>
                  <slot name="input"></slot>
                </div>
              `
            }
          }
        }
      })

      await flushPromises()

      const testMessage = 'Test unhandled error message'
      
      // Type a message
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue(testMessage)
      
      // Submit the message
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Verify message was restored for unhandled errors
      expect(wrapper.vm.newMessage).toBe(testMessage)
    })

    it('should handle network errors by restoring message', async () => {
      // Mock network error
      const networkError = new Error('Network Error')
      networkError.code = 'ERR_NETWORK'
      mockSendMessage.mockRejectedValue(networkError)

      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            ChatPanelLayout: {
              template: `
                <div>
                  <slot name="input"></slot>
                </div>
              `
            }
          }
        }
      })

      await flushPromises()

      const testMessage = 'Test network error message'
      
      // Type a message
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue(testMessage)
      
      // Submit the message
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Verify message was restored for network errors (user should be able to retry)
      expect(wrapper.vm.newMessage).toBe(testMessage)
    })

    it('should handle streaming errors gracefully without restoring message', async () => {
      // Mock streaming that starts successfully but has an internal error
      // (this would be handled by handleAsyncOperation and return null)
      mockSendMessage.mockResolvedValue(null)

      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            ChatPanelLayout: {
              template: `
                <div>
                  <slot name="input"></slot>
                </div>
              `
            }
          }
        }
      })

      await flushPromises()

      // Type a message
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue('Test streaming error message')
      
      // Submit the message
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Verify message was cleared (streaming errors are handled internally)
      expect(wrapper.vm.newMessage).toBe('')
    })
  })

  describe('Edge Cases', () => {
    it('should not clear message when validation fails', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            ChatPanelLayout: {
              template: `
                <div>
                  <slot name="input"></slot>
                </div>
              `
            }
          }
        }
      })

      await flushPromises()

      // Type empty message (should fail validation)
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue('   ') // Just spaces
      
      // Submit the message
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Verify sendMessage was not called
      expect(mockSendMessage).not.toHaveBeenCalled()
      
      // Verify message was not cleared (validation failed)
      expect(wrapper.vm.newMessage).toBe('   ')
    })

    it('should trim message before sending', async () => {
      // Mock successful send to test trimming
      mockSendMessage.mockResolvedValue({ success: true })

      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            ChatPanelLayout: {
              template: `
                <div>
                  <slot name="input"></slot>
                </div>
              `
            }
          }
        }
      })

      await flushPromises()

      const testMessage = '  Test message with spaces  '
      
      // Type a message with leading/trailing spaces
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue(testMessage)
      
      // Submit the message
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Verify sendMessage was called with trimmed message
      expect(mockSendMessage).toHaveBeenCalledWith(
        'test-chat-123',
        'Test message with spaces',
        undefined,
        'gpt-4'
      )

      // Verify message was cleared on success
      expect(wrapper.vm.newMessage).toBe('')
    })
  })
})