import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatApi } from '../../api/chats'
import { mockPaginatedResponse, shouldUseMockData } from '../mockData'
import type { 
  CompleteChatDataResponse, 
  TreeNode, 
  HistoryMessage,
  MessageResponse,
  ChatListItem,
  PaginatedResponse
} from '../../types/api'

export const useChatListStore = defineStore('chatList', () => {
  // Core data state
  const currentChatUuid = ref<string | null>(null)
  const chatData = ref<CompleteChatDataResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Chat list state
  const recentChats = ref<ChatListItem[]>([])
  const totalChats = ref(0)
  const currentPage = ref(1)
  const totalPages = ref(1)

  // Computed getters
  const treeStructure = computed((): TreeNode | null => {
    return chatData.value?.tree_structure || null
  })

  const messages = computed((): HistoryMessage[] => {
    return chatData.value?.messages || []
  })

  const chatTitle = computed((): string => {
    return chatData.value?.title || 'New Chat'
  })

  const systemPrompt = computed((): string | null => {
    return chatData.value?.system_prompt || null
  })

  // Chat CRUD operations
  async function loadCompleteChat(chatUuid: string) {
    isLoading.value = true
    error.value = null
    
    try {
      const data = await chatApi.getCompleteChat(chatUuid)
      chatData.value = data
      currentChatUuid.value = chatUuid
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load chat'
    } finally {
      isLoading.value = false
    }
  }

  async function sendMessage(content: string, modelId?: string | null, parentMessageUuid?: string | null): Promise<MessageResponse | null> {
    if (!currentChatUuid.value) {
      error.value = 'No chat selected'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await chatApi.sendMessage(
        currentChatUuid.value, 
        content, 
        parentMessageUuid,
        modelId
      )
      
      // Reload complete chat data to get updated tree structure
      await loadCompleteChat(currentChatUuid.value)
      
      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to send message'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function createNewChat(initialMessage?: string, modelId?: string): Promise<string | null> {
    isLoading.value = true
    error.value = null

    try {
      const response = await chatApi.createChat(initialMessage, modelId)
      
      // Load the new chat
      await loadCompleteChat(response.chat_uuid)
      
      // Refresh the chat list to include the new chat
      console.log('New chat created, refreshing chat list...')
      await fetchRecentChats()
      
      return response.chat_uuid
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create chat'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateChatMetadata(title?: string, systemPrompt?: string) {
    if (!currentChatUuid.value) {
      error.value = 'No chat selected'
      return
    }

    try {
      await chatApi.updateChat(currentChatUuid.value, {
        title,
        system_prompt: systemPrompt
      })
      
      // Reload to get updated metadata
      await loadCompleteChat(currentChatUuid.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update chat'
    }
  }

  async function deleteChat(chatUuid: string) {
    try {
      await chatApi.deleteChat(chatUuid)
      
      // If current chat was deleted, reset state
      if (currentChatUuid.value === chatUuid) {
        reset()
      }
      
      // Refresh chat list
      await fetchRecentChats()
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete chat'
    }
  }

  // Chat list operations
  async function fetchRecentChats(page = 1, limit = 20) {
    console.log('fetchRecentChats called:', { page, limit })
    
    // In development mode, skip auth token check
    if (!import.meta.env.DEV) {
      // Check if user is authenticated before making the request
      const accessToken = localStorage.getItem('access_token')
      if (!accessToken) {
        console.warn('fetchRecentChats: No access token available')
        error.value = 'Authentication required. Please log in.'
        return
      }
    } else {
      console.log('Development mode: skipping auth token check')
    }
    
    isLoading.value = true
    error.value = null

    try {
      console.log('Making API call to getRecentChats with auth token...')
      const response = await chatApi.getRecentChats({ page, limit })
      console.log('API response received:', response)
      
      // Ensure response has the expected structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format from server')
      }
      
      const items = response.items || []
      console.log('Extracted items from response:', items)
      
      recentChats.value = items as ChatListItem[]
      totalChats.value = response.total || 0
      currentPage.value = response.page || 1
      totalPages.value = response.pages || 1
      
      console.log('Chat list updated:', {
        chatsCount: recentChats.value.length,
        total: totalChats.value,
        page: currentPage.value,
        pages: totalPages.value
      })
      
      // If we got an empty result but expected data, that might indicate an issue
      if (items.length === 0 && (response.total === undefined || response.total === null)) {
        console.warn('Empty response received - this might indicate a backend communication issue')
      }
      
    } catch (err: any) {
      console.error('fetchRecentChats error:', err)
      
      // In development mode, fallback to mock data if backend is unavailable
      if (import.meta.env.DEV && (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK' || err.response?.status === 404)) {
        console.log('Backend unavailable in dev mode, using mock data')
        const mockResponse = mockPaginatedResponse
        
        recentChats.value = mockResponse.items as ChatListItem[]
        totalChats.value = mockResponse.total
        currentPage.value = mockResponse.page
        totalPages.value = mockResponse.pages
        
        error.value = null // Clear error since we're using mock data
        return
      }
      
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        error.value = 'Cannot connect to backend server. Please ensure it is running on port 8000.'
      } else if (err.response?.status === 404) {
        error.value = 'API endpoint not found. The backend may not be running the correct version.'
      } else if (err.response?.status === 401) {
        error.value = 'Authentication required. Please log in.'
        // Clear invalid token
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      } else if (err.response?.status === 500) {
        error.value = 'Server error. Please try again later.'
      } else {
        error.value = err.message || 'Failed to fetch chats'
      }
      
      // Reset chat list on error
      recentChats.value = []
      totalChats.value = 0
      currentPage.value = 1
      totalPages.value = 1
      
    } finally {
      isLoading.value = false
    }
  }

  async function searchChats(query: string, page = 1, limit = 20) {
    isLoading.value = true
    error.value = null

    try {
      const response = await chatApi.getChats({ q: query, page, limit })
      recentChats.value = response.items as ChatListItem[]
      totalChats.value = response.total
      currentPage.value = response.page
      totalPages.value = response.pages
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to search chats'
    } finally {
      isLoading.value = false
    }
  }

  // Reset store
  function reset() {
    currentChatUuid.value = null
    chatData.value = null
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    currentChatUuid,
    chatData,
    isLoading,
    error,
    recentChats,
    totalChats,
    currentPage,
    totalPages,

    // Computed
    treeStructure,
    messages,
    chatTitle,
    systemPrompt,

    // Actions
    loadCompleteChat,
    sendMessage,
    createNewChat,
    updateChatMetadata,
    deleteChat,
    fetchRecentChats,
    searchChats,
    reset
  }
})

