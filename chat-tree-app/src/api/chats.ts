import apiClient from './client'
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
  PathResponse,
  ModelListResponse,
  ModelSelectionRequest,
  CurrentModelResponse
} from '../types/api'

// Chat API client with new endpoints
export const chatApi = {
  // Create a new chat
  async createChat(initialMessage?: string, modelId?: string): Promise<ChatCreateResponse> {
    const request: ChatCreateRequest = {
      initial_message: initialMessage || null,
      model_id: modelId || null
    }
    const response = await apiClient.post('/api/v1/chats/', request)
    return response.data
  },

  // Get complete chat data (new endpoint - replaces multiple old endpoints)
  async getCompleteChat(chatUuid: string): Promise<CompleteChatDataResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}/complete`)
    
    
    return response.data
  },

  // Send a message with optional parent_message_uuid for branching
  async sendMessage(chatUuid: string, content: string, parentMessageUuid?: string | null, modelId?: string | null): Promise<MessageResponse> {
    const request: MessageRequest = { 
      content,
      parent_message_uuid: parentMessageUuid,
      model_id: modelId
    }
    
    const response = await apiClient.post(`/api/v1/chats/${chatUuid}/messages`, request)
    return response.data
  },

  // Get chat history
  async getChatHistory(chatUuid: string): Promise<HistoryResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}/messages`)
    return response.data
  },

  // Get tree structure (legacy support)
  async getTreeStructure(chatUuid: string): Promise<TreeStructureResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}/tree`)
    return response.data
  },

  // Get chat metadata
  async getChatMetadata(chatUuid: string): Promise<ChatMetadataResponse> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}`)
    return response.data
  },

  // Get recent chats
  async getRecentChats(params?: RecentChatsParams): Promise<PaginatedResponse> {
    console.log('chatApi.getRecentChats called with params:', params)
    const response = await apiClient.get('/api/v1/chats/recent', { params })
    console.log('chatApi.getRecentChats response:', response.data)
    return response.data
  },

  // Get chats with search and pagination
  async getChats(params?: ChatListParams): Promise<PaginatedResponse> {
    const response = await apiClient.get('/api/v1/chats/', { params })
    return response.data
  },

  // Delete chat
  async deleteChat(chatUuid: string): Promise<void> {
    await apiClient.delete(`/api/v1/chats/${chatUuid}`)
  },

  // Update chat
  async updateChat(chatUuid: string, data: UpdateChatRequest): Promise<void> {
    await apiClient.patch(`/api/v1/chats/${chatUuid}`, data)
  },

  // Edit message
  async editMessage(chatUuid: string, messageId: string, content: string): Promise<void> {
    const request: EditMessageRequest = { content }
    await apiClient.patch(`/api/v1/chats/${chatUuid}/messages/${messageId}`, request)
  },

  // Delete message
  async deleteMessage(chatUuid: string, messageId: string): Promise<void> {
    await apiClient.delete(`/api/v1/chats/${chatUuid}/messages/${messageId}`)
  },

  // Retry message
  async retryMessage(chatUuid: string, messageId: string): Promise<MessageResponse> {
    const response = await apiClient.post(`/api/v1/chats/${chatUuid}/messages/${messageId}/retry`, {})
    return response.data
  },

  // Search messages
  async searchMessages(chatUuid: string, query: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/chats/${chatUuid}/search`, { 
      params: { q: query }
    })
    return response.data
  },

  // Note: Old API endpoints removed as they don't exist in current backend
}

// Models API client
export const modelsApi = {
  // Get available models
  async getModels(category?: string): Promise<ModelListResponse> {
    const params = category ? { category } : {}
    const response = await apiClient.get('/api/v1/models/', { params })
    return response.data
  },

  // Select model
  async selectModel(modelId: string): Promise<void> {
    const request: ModelSelectionRequest = { model_id: modelId }
    await apiClient.post('/api/v1/models/select', request)
  },

  // Get current model
  async getCurrentModel(): Promise<CurrentModelResponse> {
    const response = await apiClient.get('/api/v1/models/current')
    return response.data
  }
}

// Export auth client separately  
export { authApi } from './client'