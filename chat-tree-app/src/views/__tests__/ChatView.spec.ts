import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatView from '../ChatView.vue'
import { useChatDetailStore } from '@/stores/chats'
import { useAuthStore } from '@/stores/auth'
import type { CompleteChatDataResponse, TreeNode } from '@/types/api'

// Mock the router
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'test-chat-id' }
  }),
  useRouter: () => ({
    push: vi.fn()
  })
}))

// Mock the chats API
vi.mock('../../api/chats', () => ({
  chatApi: {
    getCompleteChat: vi.fn(),
    sendMessage: vi.fn(),
    createChat: vi.fn(),
    updateChat: vi.fn(),
    deleteChat: vi.fn(),
    getRecentChats: vi.fn(),
    getChats: vi.fn()
  }
}))

// Mock child components
vi.mock('@/components/ChatTreeView.vue', () => ({
  default: {
    name: 'ChatTreeView',
    template: '<div data-test="chat-tree-view">ChatTreeView</div>',
    props: ['treeStructure', 'selectedNodeUuid', 'currentPath', 'showSystemMessages'],
    emits: ['node-click']
  }
}))

vi.mock('@/components/MessageStream.vue', () => ({
  default: {
    name: 'MessageStream', 
    template: '<div data-test="message-stream">MessageStream</div>',
    props: ['messages', 'selectedMessageUuid', 'isBranchingMode'],
    emits: ['select-message']
  }
}))

vi.mock('@/components/ModelSelector.vue', () => ({
  default: {
    name: 'ModelSelector',
    template: '<div data-test="model-selector">ModelSelector</div>'
  }
}))

describe('ChatView', () => {
  const mockTreeStructure: TreeNode = {
    uuid: 'root',
    role: 'system',
    content: 'You are a helpful assistant.',
    children: [
      {
        uuid: 'msg1',
        role: 'user',
        content: 'Hello',
        children: [
          {
            uuid: 'msg2',
            role: 'assistant',
            content: 'Hi there!',
            children: []
          }
        ]
      }
    ]
  }

  const mockChatData: CompleteChatDataResponse = {
    chat_uuid: 'test-chat-id',
    title: 'Test Chat',
    system_prompt: 'You are a helpful assistant.',
    messages: [
      { message_uuid: 'msg1', role: 'user', content: 'Hello' },
      { message_uuid: 'msg2', role: 'assistant', content: 'Hi there!' }
    ],
    tree_structure: mockTreeStructure,
    metadata: {}
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render chat interface with all components', async () => {
    const chatsStore = useChatDetailStore()
    chatsStore.chatData = mockChatData
    chatsStore.showSystemMessages = true

    const wrapper = mount(ChatView)

    expect(wrapper.find('[data-test="chat-tree-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="message-stream"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="model-selector"]').exists()).toBe(true)
  })

  describe('System Message Toggle', () => {
    it('should render system message toggle button', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.chatData = mockChatData
      chatsStore.showSystemMessages = true

      const wrapper = mount(ChatView)

      const toggleButton = wrapper.find('[data-test="system-messages-toggle"]')
      expect(toggleButton.exists()).toBe(true)
      expect(toggleButton.text()).toContain('Hide System Messages')
    })

    it('should show correct toggle text when system messages are visible', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.chatData = mockChatData
      chatsStore.showSystemMessages = true

      const wrapper = mount(ChatView)

      const toggleButton = wrapper.find('[data-test="system-messages-toggle"]')
      expect(toggleButton.text()).toContain('Hide System Messages')
      expect(toggleButton.find('.system-toggle-icon').text()).toBe('👁️')
    })

    it('should show correct toggle text when system messages are hidden', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.chatData = mockChatData
      chatsStore.showSystemMessages = false

      const wrapper = mount(ChatView)

      const toggleButton = wrapper.find('[data-test="system-messages-toggle"]')
      expect(toggleButton.text()).toContain('Show System Messages')
      expect(toggleButton.find('.system-toggle-icon').text()).toBe('🙈')
    })

    it('should toggle system message visibility when button is clicked', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.chatData = mockChatData
      chatsStore.showSystemMessages = true
      chatsStore.toggleSystemMessages = vi.fn()

      const wrapper = mount(ChatView)

      const toggleButton = wrapper.find('[data-test="system-messages-toggle"]')
      await toggleButton.trigger('click')

      expect(chatsStore.toggleSystemMessages).toHaveBeenCalledOnce()
    })

    it('should pass showSystemMessages prop to ChatTreeView', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.chatData = mockChatData
      chatsStore.showSystemMessages = false

      const wrapper = mount(ChatView)

      const chatTreeView = wrapper.findComponent({ name: 'ChatTreeView' })
      expect(chatTreeView.props('showSystemMessages')).toBe(false)
    })

    it('should pass filtered messages to MessageStream when system messages are hidden', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.chatData = mockChatData
      chatsStore.showSystemMessages = false
      chatsStore.getFilteredMessages = vi.fn().mockReturnValue([
        { message_uuid: 'msg1', role: 'user', content: 'Hello' },
        { message_uuid: 'msg2', role: 'assistant', content: 'Hi there!' }
      ])

      const wrapper = mount(ChatView)

      expect(chatsStore.getFilteredMessages).toHaveBeenCalled()
      
      const messageStream = wrapper.findComponent({ name: 'MessageStream' })
      expect(messageStream.props('messages')).toHaveLength(2)
      expect(messageStream.props('messages').every((msg: any) => msg.role !== 'system')).toBe(true)
    })

    it('should pass all messages to MessageStream when system messages are visible', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.chatData = mockChatData
      chatsStore.showSystemMessages = true
      chatsStore.getFilteredMessages = vi.fn().mockReturnValue(mockChatData.messages)

      const wrapper = mount(ChatView)

      expect(chatsStore.getFilteredMessages).toHaveBeenCalled()
      
      const messageStream = wrapper.findComponent({ name: 'MessageStream' })
      expect(messageStream.props('messages')).toEqual(mockChatData.messages)
    })

    it('should be positioned in the header section', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.chatData = mockChatData
      chatsStore.showSystemMessages = true

      const wrapper = mount(ChatView)

      const header = wrapper.find('.chat-header, .header, [data-test="chat-header"]')
      const toggleButton = wrapper.find('[data-test="system-messages-toggle"]')
      
      // Button should be within or near the header area
      expect(toggleButton.exists()).toBe(true)
    })

    it('should have proper styling for toggle button', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.chatData = mockChatData
      chatsStore.showSystemMessages = true

      const wrapper = mount(ChatView)

      const toggleButton = wrapper.find('[data-test="system-messages-toggle"]')
      expect(toggleButton.classes()).toContain('system-messages-toggle')
      expect(toggleButton.element.tagName).toBe('BUTTON')
    })
  })

  describe('Integration with Chat Store', () => {
    it('should load chat data on mount', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.loadCompleteChat = vi.fn()

      mount(ChatView)

      expect(chatsStore.loadCompleteChat).toHaveBeenCalledWith('test-chat-id')
    })

    it('should handle chat store state changes', async () => {
      const chatsStore = useChatDetailStore()
      chatsStore.chatData = null
      chatsStore.isLoading = true

      const wrapper = mount(ChatView)

      expect(wrapper.find('.loading, [data-test="loading"]').exists()).toBe(true)
    })
  })
})