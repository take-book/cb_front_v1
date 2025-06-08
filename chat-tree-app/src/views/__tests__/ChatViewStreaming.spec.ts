import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import ChatView from '../ChatView.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useChatDetailStore } from '../../stores/chats'
import type { TreeNode, HistoryMessage } from '../../types/api'

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
const mockCurrentStreamingMessage = ref(null)
const mockSendStreamingMessage = vi.fn()

vi.mock('../../composables/useStreamingMessage', () => ({
  useStreamingMessage: () => ({
    streamingMessages: mockStreamingMessages,
    currentStreamingMessage: mockCurrentStreamingMessage,
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

// Mock getBranchConversationThread
vi.mock('../../utils/treeHelpers', () => ({
  getBranchConversationThread: vi.fn().mockReturnValue([])
}))

describe('ChatView Streaming Integration', () => {
  let wrapper: any
  let chatsStore: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockStreamingMessages.value = new Map()
    mockIsStreaming.value = false
    mockCurrentStreamingMessage.value = null

    // Create pinia instance
    setActivePinia(createPinia())
    chatsStore = useChatDetailStore()

    // Mock chat store data
    const mockTreeStructure: TreeNode = {
      uuid: 'root',
      role: 'system',
      content: 'System prompt',
      children: []
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
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Streaming Message Display', () => {
    it('should display streaming messages in the UI', async () => {
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

      // Simulate user sending a message with streaming enabled
      const messageInput = wrapper.find('[data-test="message-input"]')
      const streamingToggle = wrapper.find('button[type="button"]').element as HTMLButtonElement
      
      // Enable streaming mode
      await streamingToggle.click()
      await nextTick()

      // Type a message
      await messageInput.setValue('Hello AI')
      
      // Submit the form
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')
      await flushPromises()

      // Verify sendStreamingMessage was called
      expect(mockSendStreamingMessage).toHaveBeenCalledWith(
        'test-chat-123',
        'Hello AI',
        undefined,
        undefined
      )

      // Simulate user message being added to streaming messages
      const userMessageId = 'user-123'
      mockStreamingMessages.value.set(userMessageId, {
        id: userMessageId,
        role: 'user',
        content: 'Hello AI',
        isComplete: true,
        timestamp: Date.now()
      })

      // Simulate streaming response starting
      mockIsStreaming.value = true
      const assistantMessageId = 'assistant-123'
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: 'Hello',
        isComplete: false,
        timestamp: Date.now()
      }
      mockStreamingMessages.value.set(assistantMessageId, assistantMessage)
      mockCurrentStreamingMessage.value = assistantMessage as any

      await nextTick()

      // Check if streaming message is passed to ChatPanelLayout
      const chatPanelLayout = wrapper.findComponent({ name: 'ChatPanelLayout' })
      expect(chatPanelLayout.exists()).toBe(true)
      expect(chatPanelLayout.props('streamingMessage')).toEqual(assistantMessage)
    })

    it('should show both user and assistant messages during streaming', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      // Add user message
      mockStreamingMessages.value.set('user-msg', {
        id: 'user-msg',
        role: 'user',
        content: 'What is the weather?',
        isComplete: true,
        timestamp: Date.now()
      })

      // Add streaming assistant message
      const assistantMsg = {
        id: 'assistant-msg',
        role: 'assistant' as const,
        content: 'The weather today is',
        isComplete: false,
        timestamp: Date.now()
      }
      mockStreamingMessages.value.set('assistant-msg', assistantMsg)
      mockCurrentStreamingMessage.value = assistantMsg as any
      mockIsStreaming.value = true

      await nextTick()

      // Both messages should be tracked
      expect(mockStreamingMessages.value.size).toBe(2)
      expect(Array.from(mockStreamingMessages.value.values())).toHaveLength(2)
    })

    it('should update streaming message content progressively', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      const assistantMessageId = 'stream-123'
      const streamingMsg = {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: 'I',
        isComplete: false,
        timestamp: Date.now()
      }

      // Start streaming
      mockIsStreaming.value = true
      mockStreamingMessages.value.set(assistantMessageId, streamingMsg)
      mockCurrentStreamingMessage.value = streamingMsg as any

      await nextTick()

      // Update content progressively
      streamingMsg.content = 'I am'
      await nextTick()

      streamingMsg.content = 'I am an AI'
      await nextTick()

      streamingMsg.content = 'I am an AI assistant.'
      streamingMsg.isComplete = true
      mockIsStreaming.value = false

      await nextTick()

      // Verify final state
      const finalMessage = mockStreamingMessages.value.get(assistantMessageId)
      expect(finalMessage?.content).toBe('I am an AI assistant.')
      expect(finalMessage?.isComplete).toBe(true)
    })

    it('should handle streaming errors gracefully', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      // Start streaming
      mockIsStreaming.value = true
      const errorMsg = {
        id: 'error-stream',
        role: 'assistant' as const,
        content: 'Error: Connection failed',
        isComplete: true,
        timestamp: Date.now()
      }
      mockStreamingMessages.value.set('error-stream', errorMsg)
      mockCurrentStreamingMessage.value = null
      mockIsStreaming.value = false

      await nextTick()

      // Should handle error state
      expect(mockIsStreaming.value).toBe(false)
      expect(mockCurrentStreamingMessage.value).toBeNull()
    })
  })

  describe('Combined Messages Display', () => {
    it('should combine store messages with streaming messages for display', async () => {
      // Setup store with existing messages
      const existingMessages: HistoryMessage[] = [
        {
          message_uuid: 'msg-1',
          role: 'user',
          content: 'Previous question'
        },
        {
          message_uuid: 'msg-2',
          role: 'assistant',
          content: 'Previous answer'
        }
      ]

      chatsStore.$patch({
        chatData: {
          ...chatsStore.chatData,
          messages: existingMessages
        }
      })

      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      // Add streaming messages
      mockStreamingMessages.value.set('new-user', {
        id: 'new-user',
        role: 'user',
        content: 'New question',
        isComplete: true,
        timestamp: Date.now()
      })

      const streamingAssistant = {
        id: 'new-assistant',
        role: 'assistant' as const,
        content: 'Streaming response...',
        isComplete: false,
        timestamp: Date.now()
      }
      mockStreamingMessages.value.set('new-assistant', streamingAssistant)
      mockCurrentStreamingMessage.value = streamingAssistant as any
      mockIsStreaming.value = true

      await nextTick()

      // Should have both store messages and streaming messages available
      expect(chatsStore.messages).toHaveLength(2)
      expect(mockStreamingMessages.value.size).toBe(2)
    })
  })

  describe('SSE/REST Toggle', () => {
    it('should toggle between SSE and REST modes', async () => {
      wrapper = mount(ChatView, {
        global: {
          plugins: [createPinia()],
          stubs: {
            ChatControls: true,
            RouterLink: true
          }
        }
      })

      // Find toggle button
      const toggleButton = wrapper.find('button[type="button"]')
      expect(toggleButton.exists()).toBe(true)

      // Check initial state (SSE enabled)
      let toggleLabel = wrapper.find('.text-xs.text-indigo-600')
      expect(toggleLabel.text()).toBe('SSE')

      // Toggle to REST
      await toggleButton.trigger('click')
      await nextTick()

      toggleLabel = wrapper.find('.text-xs.text-gray-500')
      expect(toggleLabel.text()).toBe('REST')

      // Send message in REST mode
      const messageInput = wrapper.find('[data-test="message-input"]')
      await messageInput.setValue('Test REST')
      await wrapper.find('[data-test="message-form"]').trigger('submit.prevent')

      // Should call store method, not streaming
      expect(chatsStore.sendMessage).toHaveBeenCalled()
      expect(mockSendStreamingMessage).not.toHaveBeenCalled()
    })
  })
})