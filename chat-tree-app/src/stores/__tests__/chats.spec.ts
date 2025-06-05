import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatsStore } from '../chats'
import { chatsApi } from '@/api/chats'

vi.mock('@/api/chats')

describe('Chats Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const chatsStore = useChatsStore()
      
      expect(chatsStore.chats).toEqual([])
      expect(chatsStore.currentChat).toBeNull()
      expect(chatsStore.currentChatHistory).toEqual([])
      expect(chatsStore.currentPage).toBe(1)
      expect(chatsStore.totalPages).toBe(1)
      expect(chatsStore.loading).toBe(false)
      expect(chatsStore.error).toBeNull()
    })
  })

  describe('Fetch Chats', () => {
    it('should fetch recent chats successfully', async () => {
      const chatsStore = useChatsStore()
      const mockResponse = {
        items: [
          {
            chat_uuid: 'chat-1',
            title: 'Chat 1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            message_count: 5
          },
          {
            chat_uuid: 'chat-2',
            title: 'Chat 2',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            message_count: 3
          }
        ],
        total: 2,
        page: 1,
        limit: 20,
        pages: 1
      }

      vi.mocked(chatsApi.getRecentChats).mockResolvedValueOnce(mockResponse)

      await chatsStore.fetchRecentChats()

      expect(chatsStore.chats).toEqual(mockResponse.items)
      expect(chatsStore.currentPage).toBe(1)
      expect(chatsStore.totalPages).toBe(1)
      expect(chatsStore.loading).toBe(false)
      expect(chatsStore.error).toBeNull()
    })

    it('should handle fetch error', async () => {
      const chatsStore = useChatsStore()
      const error = new Error('Failed to fetch chats')
      
      vi.mocked(chatsApi.getRecentChats).mockRejectedValueOnce(error)

      await chatsStore.fetchRecentChats()

      expect(chatsStore.chats).toEqual([])
      expect(chatsStore.error).toBe('Failed to fetch chats')
      expect(chatsStore.loading).toBe(false)
    })
  })

  describe('Create Chat', () => {
    it('should create a new chat successfully', async () => {
      const chatsStore = useChatsStore()
      const mockResponse = {
        chat_uuid: 'new-chat-uuid'
      }

      vi.mocked(chatsApi.createChat).mockResolvedValueOnce(mockResponse)

      const result = await chatsStore.createChat('Hello, world!')

      expect(result).toEqual(mockResponse)
      expect(chatsApi.createChat).toHaveBeenCalledWith({ initial_message: 'Hello, world!' })
    })

    it('should create chat without initial message', async () => {
      const chatsStore = useChatsStore()
      const mockResponse = {
        chat_uuid: 'new-chat-uuid'
      }

      vi.mocked(chatsApi.createChat).mockResolvedValueOnce(mockResponse)

      const result = await chatsStore.createChat()

      expect(result).toEqual(mockResponse)
      expect(chatsApi.createChat).toHaveBeenCalledWith({})
    })
  })

  describe('Load Chat', () => {
    it('should load chat metadata and history', async () => {
      const chatsStore = useChatsStore()
      const mockMetadata = {
        chat_uuid: 'chat-1',
        title: 'Test Chat',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        message_count: 2,
        owner_id: 'user-1'
      }
      const mockHistory = {
        messages: [
          {
            message_uuid: 'msg-1',
            role: 'user',
            content: 'Hello'
          },
          {
            message_uuid: 'msg-2',
            role: 'assistant',
            content: 'Hi there!'
          }
        ]
      }

      const mockPath = { path: ['msg-1', 'msg-2'] }

      vi.mocked(chatsApi.getChatMetadata).mockResolvedValueOnce(mockMetadata)
      vi.mocked(chatsApi.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(chatsApi.getPath).mockResolvedValueOnce(mockPath)

      await chatsStore.loadChat('chat-1')

      expect(chatsStore.currentChat).toEqual(mockMetadata)
      expect(chatsStore.currentChatHistory).toEqual(mockHistory.messages)
      expect(chatsStore.loading).toBe(false)
    })
  })

  describe('Send Message', () => {
    it('should send message and update history', async () => {
      const chatsStore = useChatsStore()
      chatsStore.currentChat = {
        chat_uuid: 'chat-1',
        title: 'Test Chat',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        message_count: 0,
        owner_id: 'user-1'
      }
      
      const mockResponse = {
        message_uuid: 'new-msg',
        content: 'This is the response'
      }

      const mockHistory = {
        messages: [
          { message_uuid: 'user-msg', role: 'user', content: 'Hello AI!' },
          { message_uuid: 'new-msg', role: 'assistant', content: 'This is the response' }
        ]
      }

      const mockPath = { path: ['user-msg', 'new-msg'] }
      const mockTreeStructure = {
        tree: { uuid: 'user-msg', role: 'user', content: 'Hello AI!', children: [] },
        current_node_uuid: 'new-msg'
      }

      vi.mocked(chatsApi.sendMessage).mockResolvedValueOnce(mockResponse)
      vi.mocked(chatsApi.getHistory).mockResolvedValueOnce(mockHistory)
      vi.mocked(chatsApi.getPath).mockResolvedValueOnce(mockPath)
      vi.mocked(chatsApi.getTreeStructure).mockResolvedValueOnce(mockTreeStructure)

      const result = await chatsStore.sendMessage('Hello AI!')

      expect(result).toEqual(mockResponse)
      expect(chatsApi.sendMessage).toHaveBeenCalledWith('chat-1', { content: 'Hello AI!' })
      
      // Should update history from API response
      expect(chatsStore.currentChatHistory).toEqual(mockHistory.messages)
      expect(chatsStore.currentPath).toEqual(['user-msg', 'new-msg'])
      expect(chatsStore.currentTreeStructure).toEqual(mockTreeStructure)
    })

    it('should throw error if no current chat', async () => {
      const chatsStore = useChatsStore()
      
      await expect(chatsStore.sendMessage('Hello')).rejects.toThrow('No active chat')
    })
  })

  describe('Delete Chat', () => {
    it('should delete chat and remove from list', async () => {
      const chatsStore = useChatsStore()
      chatsStore.chats = [
        {
          chat_uuid: 'chat-1',
          title: 'Chat 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          message_count: 5
        },
        {
          chat_uuid: 'chat-2',
          title: 'Chat 2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          message_count: 3
        }
      ]

      vi.mocked(chatsApi.deleteChat).mockResolvedValueOnce(undefined)

      await chatsStore.deleteChat('chat-1')

      expect(chatsStore.chats).toHaveLength(1)
      expect(chatsStore.chats[0].chat_uuid).toBe('chat-2')
      expect(chatsApi.deleteChat).toHaveBeenCalledWith('chat-1')
    })
  })

  describe('Search Chats', () => {
    it('should search chats with query', async () => {
      const chatsStore = useChatsStore()
      const mockResponse = {
        items: [
          {
            chat_uuid: 'chat-1',
            title: 'Matching Chat',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            message_count: 5
          }
        ],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1
      }

      vi.mocked(chatsApi.getChats).mockResolvedValueOnce(mockResponse)

      await chatsStore.searchChats('test query')

      expect(chatsStore.chats).toEqual(mockResponse.items)
      expect(chatsApi.getChats).toHaveBeenCalledWith({
        q: 'test query',
        page: 1,
        limit: 20
      })
    })
  })
})