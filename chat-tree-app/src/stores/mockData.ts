import type { ChatListItem, PaginatedResponse, CompleteChatDataResponse, TreeNode } from '../types/api'

// Mock chat list data for development
export const mockChatList: ChatListItem[] = [
  {
    chat_uuid: 'mock-chat-1',
    title: 'First Chat (Mock)',
    updated_at: new Date().toISOString(),
    message_count: 5
  },
  {
    chat_uuid: 'mock-chat-2',
    title: 'Second Chat (Mock)',
    updated_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    message_count: 3
  },
  {
    chat_uuid: 'mock-chat-3',
    title: 'Third Chat (Mock)',
    updated_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    message_count: 8
  }
]

export const mockPaginatedResponse: PaginatedResponse = {
  items: mockChatList,
  total: mockChatList.length,
  page: 1,
  limit: 20,
  pages: 1
}

// Mock tree structure
export const mockTreeStructure: TreeNode = {
  uuid: 'root',
  role: 'system',
  content: '',
  children: [
    {
      uuid: 'msg-1',
      role: 'user',
      content: 'Hello! Can you help me understand how this chat tree works?',
      children: [
        {
          uuid: 'msg-2',
          role: 'assistant',
          content: 'Of course! This is a tree-based conversation system where you can branch conversations at any point. You can click on any previous message to create a new branch from that point.',
          children: [
            {
              uuid: 'msg-3',
              role: 'user',
              content: 'That sounds interesting! Can I try it?',
              children: [
                {
                  uuid: 'msg-4',
                  role: 'assistant',
                  content: 'Absolutely! Just click on any message in the tree view and then type a new message to create a branch.',
                  children: []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

export const mockCompleteChat: CompleteChatDataResponse = {
  chat_uuid: 'mock-chat-1',
  title: 'Demo Chat (Mock Data)',
  system_prompt: 'You are a helpful assistant.',
  messages: [
    { message_uuid: 'msg-1', role: 'user', content: 'Hello! Can you help me understand how this chat tree works?' },
    { message_uuid: 'msg-2', role: 'assistant', content: 'Of course! This is a tree-based conversation system where you can branch conversations at any point. You can click on any previous message to create a new branch from that point.' },
    { message_uuid: 'msg-3', role: 'user', content: 'That sounds interesting! Can I try it?' },
    { message_uuid: 'msg-4', role: 'assistant', content: 'Absolutely! Just click on any message in the tree view and then type a new message to create a branch.' }
  ],
  tree_structure: mockTreeStructure,
  metadata: {
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

export function shouldUseMockData(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true'
}