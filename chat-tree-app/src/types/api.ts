// API Request/Response Types - Based on new OpenAPI specification

// Auth Types
export interface LoginRequest {
  username: string
  password: string
  grant_type?: 'password'
  scope?: string
  client_id?: string
  client_secret?: string
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

// Chat Types
export interface ChatCreateRequest {
  initial_message?: string | null
  model_id?: string | null
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

export interface UpdateChatRequest {
  title?: string | null
  system_prompt?: string | null
}

// Message Types
export interface MessageRequest {
  content: string
  parent_message_uuid?: string | null
  model_id?: string | null
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

export interface EditMessageRequest {
  content: string
}

// Tree Structure Types
export interface TreeNode {
  uuid: string
  role: string
  content: string
  children: TreeNode[]
}

export interface TreeStructureResponse {
  chat_uuid: string
  tree: TreeNode
  current_node_uuid: string
}

// Complete Chat Data Type (New in updated API)
export interface CompleteChatDataResponse {
  chat_uuid: string
  title: string
  system_prompt: string | null
  messages: HistoryMessage[]
  tree_structure: TreeNode
  metadata: Record<string, any>
}

// Pagination Types
export interface PaginatedResponse {
  items: Record<string, any>[]
  total: number
  page: number
  limit: number
  pages: number
}

// Error Types
export interface ValidationError {
  loc: (string | number)[]
  msg: string
  type: string
}

export interface HTTPValidationError {
  detail: ValidationError[]
}

// Query Parameters
export interface ChatListParams {
  page?: number
  limit?: number
  sort?: string | null
  q?: string | null
}

export interface RecentChatsParams {
  page?: number
  limit?: number
}

// Branching Types (from old API)
export interface SelectRequest {
  message_uuid: string
}

export interface PathResponse {
  path: string[]
}

// Auth Response
export interface AuthResponse {
  access_token: string
  token_type: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  refresh_token?: string
}

// User Info
export interface UserInfo {
  uuid: string
  username: string
}

// Simplified Chat Item for lists
export interface ChatListItem {
  chat_uuid: string
  title: string
  updated_at: string
  message_count: number
}

// Type guards
export function isTreeNode(obj: any): obj is TreeNode {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'uuid' in obj &&
    'role' in obj &&
    'content' in obj &&
    'children' in obj &&
    Array.isArray(obj.children)
  )
}

export function isHistoryMessage(obj: any): obj is HistoryMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message_uuid' in obj &&
    'role' in obj &&
    'content' in obj
  )
}

// Model Types
export interface ModelArchitecture {
  input_modalities: string[]
  output_modalities: string[]
  tokenizer: string
}

export interface ModelPricing {
  prompt: string
  completion: string
}

export interface ModelDto {
  id: string
  name: string
  created: number
  description?: string
  architecture?: ModelArchitecture
  pricing?: ModelPricing
  context_length?: number
}

export interface ModelListResponse {
  data: ModelDto[]
}

export interface ModelSelectionRequest {
  model_id: string
}

export interface CurrentModelResponse {
  model_id: string
  name: string
}