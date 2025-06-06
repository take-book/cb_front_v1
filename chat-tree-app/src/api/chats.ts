import axios from 'axios'
import type {
  ChatCreateRequest,
  ChatCreateResponse,
  CompleteChatDataResponse,
  MessageRequest,
  MessageResponse,
  HistoryResponse,
  TreeStructureResponse,
  ChatMetadataResponse,
  PaginatedResponse,
  UpdateChatRequest,
  EditMessageRequest,
  ChatListParams,
  RecentChatsParams,
  SelectRequest,
  PathResponse
} from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Helper function to get auth headers
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Chat API client with new endpoints
export const chatApi = {
  // Create a new chat
  async createChat(initialMessage?: string): Promise<ChatCreateResponse> {
    const request: ChatCreateRequest = initialMessage ? { initial_message: initialMessage } : {}
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/chats/`,
      request,
      { headers: getAuthHeaders() }
    )
    return response.data
  },

  // Get complete chat data (new endpoint - replaces multiple old endpoints)
  async getCompleteChat(chatUuid: string): Promise<CompleteChatDataResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/chats/${chatUuid}/complete`,
      { headers: getAuthHeaders() }
    )
    return response.data
  },

  // Send a message with optional parent_message_uuid for branching
  async sendMessage(chatUuid: string, content: string, parentMessageUuid?: string | null): Promise<MessageResponse> {
    const request: MessageRequest = { 
      content,
      parent_message_uuid: parentMessageUuid 
    }
    const url = `${API_BASE_URL}/api/v1/chats/${chatUuid}/messages`
    const headers = getAuthHeaders()
    
    console.log('Sending message to API:', {
      url,
      request,
      headers: Object.keys(headers),
      hasAuth: !!headers.Authorization,
      isBranching: !!parentMessageUuid
    })
    
    try {
      const response = await axios.post(url, request, { headers })
      console.log('API response:', response.data)
      return response.data
    } catch (error: any) {
      console.error('API error:', {
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      })
      throw error
    }
  },

  // Get chat history
  async getChatHistory(chatUuid: string): Promise<HistoryResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/chats/${chatUuid}/messages`,
      { headers: getAuthHeaders() }
    )
    return response.data
  },

  // Get tree structure (legacy support)
  async getTreeStructure(chatUuid: string): Promise<TreeStructureResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/chats/${chatUuid}/tree`,
      { headers: getAuthHeaders() }
    )
    return response.data
  },

  // Get chat metadata
  async getChatMetadata(chatUuid: string): Promise<ChatMetadataResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/chats/${chatUuid}`,
      { headers: getAuthHeaders() }
    )
    return response.data
  },

  // Get recent chats
  async getRecentChats(params?: RecentChatsParams): Promise<PaginatedResponse> {
    const url = `${API_BASE_URL}/api/v1/chats/recent`
    console.log('Fetching recent chats from:', url, 'with params:', params)
    
    try {
      const response = await axios.get(url, { 
        headers: getAuthHeaders(),
        params 
      })
      console.log('Recent chats response:', response.data)
      return response.data
    } catch (error: any) {
      console.error('Recent chats API error:', {
        url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      throw error
    }
  },

  // Get chats with search and pagination
  async getChats(params?: ChatListParams): Promise<PaginatedResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/chats/`,
      { 
        headers: getAuthHeaders(),
        params 
      }
    )
    return response.data
  },

  // Delete chat
  async deleteChat(chatUuid: string): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/api/v1/chats/${chatUuid}`,
      { headers: getAuthHeaders() }
    )
  },

  // Update chat
  async updateChat(chatUuid: string, data: UpdateChatRequest): Promise<void> {
    await axios.patch(
      `${API_BASE_URL}/api/v1/chats/${chatUuid}`,
      data,
      { headers: getAuthHeaders() }
    )
  },

  // Edit message
  async editMessage(chatUuid: string, messageId: string, content: string): Promise<void> {
    const request: EditMessageRequest = { content }
    await axios.patch(
      `${API_BASE_URL}/api/v1/chats/${chatUuid}/messages/${messageId}`,
      request,
      { headers: getAuthHeaders() }
    )
  },

  // Delete message
  async deleteMessage(chatUuid: string, messageId: string): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/api/v1/chats/${chatUuid}/messages/${messageId}`,
      { headers: getAuthHeaders() }
    )
  },

  // Retry message
  async retryMessage(chatUuid: string, messageId: string): Promise<MessageResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/chats/${chatUuid}/messages/${messageId}/retry`,
      {},
      { headers: getAuthHeaders() }
    )
    return response.data
  },

  // Search messages
  async searchMessages(chatUuid: string, query: string): Promise<any> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/chats/${chatUuid}/search`,
      { 
        headers: getAuthHeaders(),
        params: { q: query }
      }
    )
    return response.data
  },

  // Note: Old API endpoints removed as they don't exist in current backend
}

// Export auth client separately  
export { authApi } from './client'