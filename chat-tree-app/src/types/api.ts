// API Types based on OpenAPI specification

export interface LoginRequest {
  username: string
  password: string
  grant_type?: string
  scope?: string
  client_id?: string | null
  client_secret?: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: string
  refresh_token?: string
}

export interface RefreshTokenResponse {
  access_token: string
  token_type: string
}

export interface UserInfo {
  uuid: string
  username: string
  created_at: string
}

export interface UserRegisterRequest {
  username: string
  password: string
}

export interface UserRegisterResponse {
  uuid: string
  username: string
  created_at: string
}

export interface ChatCreateRequest {
  initial_message?: string | null
}

export interface ChatCreateResponse {
  chat_uuid: string
}

export interface ChatMetadataResponse {
  chat_uuid: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  owner_id: string
}

export interface MessageRequest {
  content: string
}

export interface MessageResponse {
  message_uuid: string
  content: string
}

export interface HistoryMessage {
  message_uuid: string
  role: string
  content: string
}

export interface HistoryResponse {
  messages: HistoryMessage[]
}

export interface SelectRequest {
  message_uuid: string
}

export interface PathResponse {
  path: string[]
}

export interface LastPositionResponse {
  node_id: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface ChatListItem {
  chat_uuid: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface UpdateChatRequest {
  title?: string | null
  system_prompt?: string | null
}

export interface EditMessageRequest {
  content: string
}

export interface CurrentNodeResponse {
  node_id: string
}

export interface SearchMessagesResponse {
  messages: HistoryMessage[]
}

// Tree Structure Types (New API)
export interface TreeNode {
  uuid: string
  children: TreeNode[]
}

export interface TreeStructureResponse {
  chat_uuid: string
  tree: TreeNode
  current_node_uuid: string
}

export interface ApiError {
  detail: string | ValidationError[]
}

export interface ValidationError {
  loc: (string | number)[]
  msg: string
  type: string
}