import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatsStore } from '../chats'
import type { CompleteChatDataResponse, TreeNode, HistoryMessage } from '../../types/api'

// Mock the API
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

describe('Chats Store (Updated)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockTreeNode: TreeNode = {
    uuid: 'root',
    role: 'system',
    content: '',
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

  const mockCompleteData: CompleteChatDataResponse = {
    chat_uuid: 'test-chat',
    title: 'Test Chat',
    system_prompt: 'You are a helpful assistant',
    messages: [
      { message_uuid: 'msg1', role: 'user', content: 'Hello' },
      { message_uuid: 'msg2', role: 'assistant', content: 'Hi there!' }
    ],
    tree_structure: mockTreeNode,
    metadata: { created_at: '2024-01-01' }
  }

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useChatsStore()
      
      expect(store.currentChatUuid).toBeNull()
      expect(store.chatData).toBeNull()
      expect(store.selectedNodeUuid).toBeNull()
      expect(store.currentPath).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.recentChats).toEqual([])
    })
  })

  describe('loadCompleteChat', () => {
    it('should load complete chat data successfully', async () => {
      const { chatApi } = await import('../../api/chats')
      vi.mocked(chatApi.getCompleteChat).mockResolvedValueOnce(mockCompleteData)
      
      const store = useChatsStore()
      await store.loadCompleteChat('test-chat')
      
      expect(store.currentChatUuid).toBe('test-chat')
      expect(store.chatData).toEqual(mockCompleteData)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle loading error', async () => {
      const { chatApi } = await import('../../api/chats')
      const error = new Error('Failed to load')
      vi.mocked(chatApi.getCompleteChat).mockRejectedValueOnce(error)
      
      const store = useChatsStore()
      await store.loadCompleteChat('test-chat')
      
      expect(store.error).toBe('Failed to load')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('sendMessage', () => {
    it('should send message and reload chat data', async () => {
      const { chatApi } = await import('../../api/chats')
      vi.mocked(chatApi.getCompleteChat).mockResolvedValueOnce(mockCompleteData)
      vi.mocked(chatApi.sendMessage).mockResolvedValueOnce({
        message_uuid: 'new-msg',
        content: 'AI response'
      })
      
      const store = useChatsStore()
      await store.loadCompleteChat('test-chat')
      
      await store.sendMessage('How are you?')
      
      expect(chatApi.sendMessage).toHaveBeenCalledWith('test-chat', 'How are you?', null)
      expect(chatApi.getCompleteChat).toHaveBeenCalledTimes(2) // Once for load, once for reload
    })

    it('should return null when no chat is selected', async () => {
      const store = useChatsStore()
      const result = await store.sendMessage('Hello')
      
      expect(result).toBeNull()
      expect(store.error).toBe('No chat selected')
    })
  })

  describe('createNewChat', () => {
    it('should create chat with initial message', async () => {
      const { chatApi } = await import('../../api/chats')
      vi.mocked(chatApi.createChat).mockResolvedValueOnce({ chat_uuid: 'new-chat' })
      vi.mocked(chatApi.getCompleteChat).mockResolvedValueOnce(mockCompleteData)
      
      const store = useChatsStore()
      const result = await store.createNewChat('Hello, world!')
      
      expect(chatApi.createChat).toHaveBeenCalledWith('Hello, world!')
      expect(result).toBe('new-chat')
    })

    it('should create chat without initial message', async () => {
      const { chatApi } = await import('../../api/chats')
      vi.mocked(chatApi.createChat).mockResolvedValueOnce({ chat_uuid: 'new-chat' })
      vi.mocked(chatApi.getCompleteChat).mockResolvedValueOnce(mockCompleteData)
      
      const store = useChatsStore()
      const result = await store.createNewChat()
      
      expect(chatApi.createChat).toHaveBeenCalledWith(undefined)
      expect(result).toBe('new-chat')
    })
  })

  describe('fetchRecentChats', () => {
    it('should fetch recent chats successfully', async () => {
      const { chatApi } = await import('../../api/chats')
      const mockResponse = {
        items: [
          { chat_uuid: 'chat1', title: 'Chat 1', updated_at: '2024-01-01', message_count: 5 },
          { chat_uuid: 'chat2', title: 'Chat 2', updated_at: '2024-01-02', message_count: 3 }
        ],
        total: 2,
        page: 1,
        limit: 20,
        pages: 1
      }
      
      vi.mocked(chatApi.getRecentChats).mockResolvedValueOnce(mockResponse)
      
      const store = useChatsStore()
      await store.fetchRecentChats()
      
      expect(store.recentChats).toHaveLength(2)
      expect(store.totalChats).toBe(2)
      expect(store.currentPage).toBe(1)
    })

    it('should handle fetch error', async () => {
      const { chatApi } = await import('../../api/chats')
      const error = new Error('Failed to fetch chats')
      
      vi.mocked(chatApi.getRecentChats).mockRejectedValueOnce(error)
      
      const store = useChatsStore()
      await store.fetchRecentChats()
      
      expect(store.error).toBe('Failed to fetch chats')
    })
  })

  describe('Navigation', () => {
    it('should select node and update path', async () => {
      const { chatApi } = await import('../../api/chats')
      vi.mocked(chatApi.getCompleteChat).mockResolvedValueOnce(mockCompleteData)
      
      const store = useChatsStore()
      await store.loadCompleteChat('test-chat')
      
      store.selectNode('msg1')
      
      expect(store.selectedNodeUuid).toBe('msg1')
      expect(store.currentPath).toHaveLength(2) // root + msg1
    })

    it('should find node in tree', async () => {
      const { chatApi } = await import('../../api/chats')
      vi.mocked(chatApi.getCompleteChat).mockResolvedValueOnce(mockCompleteData)
      
      const store = useChatsStore()
      await store.loadCompleteChat('test-chat')
      
      const foundNode = store.findNodeInTree('msg2')
      
      expect(foundNode).toBeDefined()
      expect(foundNode?.content).toBe('Hi there!')
    })

    it('should determine if in branching mode', async () => {
      const { chatApi } = await import('../../api/chats')
      vi.mocked(chatApi.getCompleteChat).mockResolvedValueOnce(mockCompleteData)
      
      const store = useChatsStore()
      await store.loadCompleteChat('test-chat')
      
      // When no node is selected, not in branching mode
      expect(store.isBranchingMode).toBe(false)
      
      // When a non-leaf node is selected, in branching mode
      store.selectNode('msg1')
      expect(store.isBranchingMode).toBe(true)
      
      // When leaf node is selected, not in branching mode
      store.selectNode('msg2')
      expect(store.isBranchingMode).toBe(false)
    })
  })

  describe('deleteChat', () => {
    it('should delete chat and refresh list', async () => {
      const { chatApi } = await import('../../api/chats')
      vi.mocked(chatApi.deleteChat).mockResolvedValueOnce(undefined)
      vi.mocked(chatApi.getRecentChats).mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        pages: 1
      })
      
      const store = useChatsStore()
      store.currentChatUuid = 'chat-to-delete'
      
      await store.deleteChat('chat-to-delete')
      
      expect(chatApi.deleteChat).toHaveBeenCalledWith('chat-to-delete')
      expect(store.currentChatUuid).toBeNull() // Reset when current chat deleted
    })
  })

  describe('searchChats', () => {
    it('should search chats with query', async () => {
      const { chatApi } = await import('../../api/chats')
      const mockResponse = {
        items: [
          { chat_uuid: 'chat1', title: 'Matching Chat', updated_at: '2024-01-01', message_count: 5 }
        ],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1
      }
      
      vi.mocked(chatApi.getChats).mockResolvedValueOnce(mockResponse)
      
      const store = useChatsStore()
      await store.searchChats('test query')
      
      expect(chatApi.getChats).toHaveBeenCalledWith({ q: 'test query', page: 1, limit: 20 })
      expect(store.recentChats).toHaveLength(1)
      expect(store.recentChats[0].title).toBe('Matching Chat')
    })
  })
})