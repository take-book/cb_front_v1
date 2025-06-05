import apiClient from './client'
import type { 
  ChatCreateRequest, 
  ChatCreateResponse, 
  ChatListItem, 
  PaginatedResponse,
  MessageRequest,
  MessageResponse,
  HistoryResponse,
  SelectRequest,
  PathResponse,
  ChatMetadataResponse,
  UpdateChatRequest,
  EditMessageRequest,
  CurrentNodeResponse,
  LastPositionResponse,
  SearchMessagesResponse,
  TreeStructureResponse
} from '@/types/api'

export const chatsApi = {
  // Create a new chat
  async createChat(data?: ChatCreateRequest): Promise<ChatCreateResponse> {
    const response = await apiClient.post('/api/v1/chats/', data || {})
    return response.data
  },

  // Get chats with pagination and search
  async getChats(params?: {
    page?: number
    limit?: number
    sort?: string
    q?: string
  }): Promise<PaginatedResponse<ChatListItem>> {
    const response = await apiClient.get('/api/v1/chats/', { params })
    return response.data
  },

  // Get recent chats
  async getRecentChats(params?: {
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<ChatListItem>> {
    const response = await apiClient.get('/api/v1/chats/recent', { params })
    return response.data
  },

  // Get chat metadata
  async getChatMetadata(chatUuid: string): Promise<ChatMetadataResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}`)
    return response.data
  },

  // Update chat
  async updateChat(chatUuid: string, data: UpdateChatRequest): Promise<void> {
    await apiClient.patch(`/api/v1/chats/${chatUuid}`, data)
  },

  // Delete chat
  async deleteChat(chatUuid: string): Promise<void> {
    await apiClient.delete(`/api/v1/chats/${chatUuid}`)
  },

  // Send message
  async sendMessage(chatUuid: string, data: MessageRequest): Promise<MessageResponse> {
    const response = await apiClient.post(`/api/v1/chats/${chatUuid}/messages`, data)
    return response.data
  },

  // Get message history
  async getHistory(chatUuid: string): Promise<HistoryResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}/messages`)
    return response.data
  },

  // Select node
  async selectNode(chatUuid: string, data: SelectRequest): Promise<void> {
    await apiClient.post(`/api/v1/chats/${chatUuid}/select`, data)
  },

  // Get path
  async getPath(chatUuid: string): Promise<PathResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}/path`)
    return response.data
  },

  // Get current node
  async getCurrentNode(chatUuid: string): Promise<CurrentNodeResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}/current-node`)
    return response.data
  },

  // Get last position
  async getLastPosition(chatUuid: string): Promise<LastPositionResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}/last-position`)
    return response.data
  },

  // Retry message
  async retryMessage(chatUuid: string, messageId: string): Promise<MessageResponse> {
    const response = await apiClient.post(`/api/v1/chats/${chatUuid}/messages/${messageId}/retry`)
    return response.data
  },

  // Edit message
  async editMessage(chatUuid: string, messageId: string, data: EditMessageRequest): Promise<void> {
    await apiClient.patch(`/api/v1/chats/${chatUuid}/messages/${messageId}`, data)
  },

  // Delete message
  async deleteMessage(chatUuid: string, messageId: string): Promise<void> {
    await apiClient.delete(`/api/v1/chats/${chatUuid}/messages/${messageId}`)
  },

  // Search messages
  async searchMessages(chatUuid: string, q: string): Promise<SearchMessagesResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}/search`, { params: { q } })
    return response.data
  },

  // Get tree structure
  async getTreeStructure(chatUuid: string): Promise<TreeStructureResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}/tree`)
    return response.data
  }
}