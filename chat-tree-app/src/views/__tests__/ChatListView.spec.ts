import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatListView from '../ChatListView.vue'
import { useChatsStore } from '@/stores/chats'
import { useAuthStore } from '@/stores/auth'
import { nextTick } from 'vue'

// Mock the API
vi.mock('@/api/chats', () => ({
  chatsApi: {
    getRecentChats: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, pages: 0 }),
    searchChats: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, pages: 0 }),
    createChat: vi.fn(),
    deleteChat: vi.fn()
  }
}))

// Mock vue-router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  RouterLink: {
    template: '<a><slot /></a>'
  }
}))

describe('ChatListView', () => {
  const mountOptions = {
    global: {
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>'
        }
      }
    }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Set up authenticated user
    const authStore = useAuthStore()
    authStore.user = { uuid: 'test-user', username: 'testuser', created_at: '2024-01-01' }
    authStore.accessToken = 'test-token'
  })

  it('should render chat list header', () => {
    const wrapper = mount(ChatListView, mountOptions)
    
    expect(wrapper.find('h1').text()).toContain('Chats')
    const newChatButton = wrapper.find('button:not([data-test="logout-button"])')
    expect(newChatButton.text()).toContain('New Chat')
  })

  it('should fetch chats on mount', async () => {
    const chatsStore = useChatsStore()
    chatsStore.fetchRecentChats = vi.fn()
    
    mount(ChatListView, mountOptions)
    await nextTick()
    
    expect(chatsStore.fetchRecentChats).toHaveBeenCalled()
  })

  it('should display loading state', () => {
    const chatsStore = useChatsStore()
    chatsStore.loading = true
    
    const wrapper = mount(ChatListView, mountOptions)
    
    expect(wrapper.text()).toContain('Loading...')
  })

  it('should display error state', () => {
    const chatsStore = useChatsStore()
    chatsStore.error = 'Failed to load chats'
    
    const wrapper = mount(ChatListView, mountOptions)
    
    expect(wrapper.text()).toContain('Failed to load chats')
  })

  it('should display empty state when no chats', () => {
    const chatsStore = useChatsStore()
    chatsStore.chats = []
    chatsStore.loading = false
    
    const wrapper = mount(ChatListView, mountOptions)
    
    expect(wrapper.text()).toContain('No chats yet')
    expect(wrapper.text()).toContain('Start a new conversation')
  })

  it('should display chat list', () => {
    const chatsStore = useChatsStore()
    chatsStore.chats = [
      {
        chat_uuid: 'chat-1',
        title: 'First Chat',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        message_count: 5
      },
      {
        chat_uuid: 'chat-2',
        title: 'Second Chat',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        message_count: 3
      }
    ]
    
    const wrapper = mount(ChatListView, mountOptions)
    
    const chatItems = wrapper.findAll('[data-test="chat-item"]')
    expect(chatItems).toHaveLength(2)
    expect(chatItems[0].text()).toContain('First Chat')
    expect(chatItems[0].text()).toContain('5 messages')
    expect(chatItems[1].text()).toContain('Second Chat')
    expect(chatItems[1].text()).toContain('3 messages')
  })

  it('should create new chat and navigate', async () => {
    const chatsStore = useChatsStore()
    chatsStore.createChat = vi.fn().mockResolvedValue({ chat_uuid: 'new-chat-uuid' })
    
    const wrapper = mount(ChatListView, mountOptions)
    
    const newChatButton = wrapper.find('button:not([data-test="logout-button"])')
    await newChatButton.trigger('click')
    await nextTick()
    
    expect(chatsStore.createChat).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/chats/new-chat-uuid')
  })

  it('should handle search input', async () => {
    const chatsStore = useChatsStore()
    chatsStore.searchChats = vi.fn()
    
    const wrapper = mount(ChatListView, mountOptions)
    
    const searchInput = wrapper.find('input[type="search"]')
    await searchInput.setValue('test query')
    await searchInput.trigger('input')
    
    // Debounce delay
    await new Promise(resolve => setTimeout(resolve, 350))
    
    expect(chatsStore.searchChats).toHaveBeenCalledWith('test query')
  })

  it('should delete chat with confirmation', async () => {
    const chatsStore = useChatsStore()
    chatsStore.chats = [
      {
        chat_uuid: 'chat-1',
        title: 'Chat to Delete',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        message_count: 5
      }
    ]
    chatsStore.deleteChat = vi.fn()
    
    // Mock window.confirm
    window.confirm = vi.fn().mockReturnValue(true)
    
    const wrapper = mount(ChatListView, mountOptions)
    
    await wrapper.find('[data-test="delete-chat"]').trigger('click')
    await nextTick()
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this chat?')
    expect(chatsStore.deleteChat).toHaveBeenCalledWith('chat-1')
  })

  it('should not delete chat if confirmation cancelled', async () => {
    const chatsStore = useChatsStore()
    chatsStore.chats = [
      {
        chat_uuid: 'chat-1',
        title: 'Chat to Keep',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        message_count: 5
      }
    ]
    chatsStore.deleteChat = vi.fn()
    
    // Mock window.confirm
    window.confirm = vi.fn().mockReturnValue(false)
    
    const wrapper = mount(ChatListView, mountOptions)
    
    await wrapper.find('[data-test="delete-chat"]').trigger('click')
    await nextTick()
    
    expect(window.confirm).toHaveBeenCalled()
    expect(chatsStore.deleteChat).not.toHaveBeenCalled()
  })

  it('should handle logout', async () => {
    const authStore = useAuthStore()
    authStore.logout = vi.fn()
    
    const wrapper = mount(ChatListView, mountOptions)
    
    await wrapper.find('[data-test="logout-button"]').trigger('click')
    
    expect(authStore.logout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})