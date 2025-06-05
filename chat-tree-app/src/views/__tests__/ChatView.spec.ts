import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatView from '../ChatView.vue'
import { useChatsStore } from '@/stores/chats'
import { nextTick } from 'vue'

// Mock router params
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { chatId: 'test-chat-uuid' }
  }),
  useRouter: () => ({
    push: vi.fn()
  }),
  RouterLink: {
    template: '<a><slot /></a>'
  }
}))

// Mock the API
vi.mock('@/api/chats', () => ({
  chatsApi: {
    getChatMetadata: vi.fn(),
    getHistory: vi.fn(),
    sendMessage: vi.fn(),
    selectNode: vi.fn(),
    getPath: vi.fn()
  }
}))

describe('ChatView', () => {
  const mountOptions = {
    global: {
      stubs: {
        ChatTreeView: {
          template: '<div data-test="chat-tree" @click="$emit(\'node-click\', \'msg-123\')">Tree</div>',
          props: ['messages', 'currentPath', 'selectedNodeId'],
          emits: ['node-click']
        },
        RouterLink: {
          template: '<a><slot /></a>'
        }
      }
    }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render chat interface', () => {
    const chatsStore = useChatsStore()
    chatsStore.currentChatHistory = [
      { message_uuid: 'msg-1', role: 'user', content: 'Hello' }
    ]
    
    const wrapper = mount(ChatView, mountOptions)
    
    expect(wrapper.find('[data-test="chat-tree"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="message-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="send-button"]').exists()).toBe(true)
  })

  it('should load chat on mount', async () => {
    const chatsStore = useChatsStore()
    chatsStore.loadChat = vi.fn()
    
    mount(ChatView, mountOptions)
    await nextTick()
    
    expect(chatsStore.loadChat).toHaveBeenCalledWith('test-chat-uuid')
  })

  it('should display loading state', () => {
    const chatsStore = useChatsStore()
    chatsStore.loading = true
    
    const wrapper = mount(ChatView, mountOptions)
    
    expect(wrapper.text()).toContain('Loading')
  })

  it('should display error state', () => {
    const chatsStore = useChatsStore()
    chatsStore.error = 'Failed to load chat'
    
    const wrapper = mount(ChatView, mountOptions)
    
    expect(wrapper.text()).toContain('Failed to load chat')
  })

  it('should send message when form is submitted', async () => {
    const chatsStore = useChatsStore()
    chatsStore.sendMessage = vi.fn().mockResolvedValue({ message_uuid: 'new-msg', content: 'Response' })
    
    const wrapper = mount(ChatView, mountOptions)
    
    const input = wrapper.find('[data-test="message-input"]')
    await input.setValue('Hello AI!')
    
    const form = wrapper.find('[data-test="message-form"]')
    await form.trigger('submit.prevent')
    await nextTick()
    
    expect(chatsStore.sendMessage).toHaveBeenCalledWith('Hello AI!')
    expect((input.element as HTMLInputElement).value).toBe('') // Input should be cleared
  })

  it('should handle message input changes', async () => {
    const wrapper = mount(ChatView, mountOptions)
    
    const input = wrapper.find('[data-test="message-input"]')
    await input.setValue('Test message')
    
    expect((input.element as HTMLInputElement).value).toBe('Test message')
  })

  it('should disable send button when loading', () => {
    const chatsStore = useChatsStore()
    chatsStore.loading = true
    
    const wrapper = mount(ChatView, mountOptions)
    
    const sendButton = wrapper.find('[data-test="send-button"]')
    expect((sendButton.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('should disable send button when message is empty', () => {
    const wrapper = mount(ChatView, mountOptions)
    
    const sendButton = wrapper.find('[data-test="send-button"]')
    expect((sendButton.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('should enable send button when message is not empty', async () => {
    const wrapper = mount(ChatView, mountOptions)
    
    const input = wrapper.find('[data-test="message-input"]')
    await input.setValue('Test message')
    await nextTick()
    
    const sendButton = wrapper.find('[data-test="send-button"]')
    expect((sendButton.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('should handle node selection in tree', async () => {
    const chatsStore = useChatsStore()
    chatsStore.selectNode = vi.fn()
    chatsStore.currentChatHistory = [
      { message_uuid: 'msg-1', role: 'user', content: 'Hello' }
    ]
    
    const wrapper = mount(ChatView, mountOptions)
    
    const treeComponent = wrapper.find('[data-test="chat-tree"]')
    await treeComponent.trigger('click')
    
    expect(chatsStore.selectNode).toHaveBeenCalledWith('msg-123')
  })

  it('should display chat title', () => {
    const chatsStore = useChatsStore()
    chatsStore.currentChat = {
      chat_uuid: 'test-chat',
      title: 'Test Chat Title',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      message_count: 5,
      owner_id: 'user-1'
    }
    
    const wrapper = mount(ChatView, mountOptions)
    
    expect(wrapper.text()).toContain('Test Chat Title')
  })

  it('should show empty state when no messages', () => {
    const chatsStore = useChatsStore()
    chatsStore.currentChatHistory = []
    chatsStore.loading = false
    
    const wrapper = mount(ChatView, mountOptions)
    
    expect(wrapper.text()).toContain('Start a conversation')
  })
})