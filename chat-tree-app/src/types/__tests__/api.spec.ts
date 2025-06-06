import { describe, it, expect } from 'vitest'
import type {
  ChatCreateRequest,
  ChatCreateResponse,
  MessageRequest,
  MessageResponse,
  HistoryMessage,
  TreeNode,
  CompleteChatDataResponse,
  ChatMetadataResponse,
  PaginatedResponse
} from '../api'

describe('API Types', () => {
  describe('ChatCreateRequest', () => {
    it('should allow empty request', () => {
      const request: ChatCreateRequest = {}
      expect(request).toEqual({})
    })

    it('should allow initial_message', () => {
      const request: ChatCreateRequest = {
        initial_message: 'Hello, world!'
      }
      expect(request.initial_message).toBe('Hello, world!')
    })
  })

  describe('ChatCreateResponse', () => {
    it('should have required chat_uuid', () => {
      const response: ChatCreateResponse = {
        chat_uuid: '123e4567-e89b-12d3-a456-426614174000'
      }
      expect(response.chat_uuid).toBeDefined()
    })
  })

  describe('MessageRequest', () => {
    it('should only have content field', () => {
      const request: MessageRequest = {
        content: 'This is a message'
      }
      expect(request.content).toBe('This is a message')
      // parent_message_uuid is no longer part of the interface
    })
  })

  describe('TreeNode', () => {
    it('should have recursive structure', () => {
      const node: TreeNode = {
        uuid: '123',
        role: 'user',
        content: 'Hello',
        children: [
          {
            uuid: '456',
            role: 'assistant',
            content: 'Hi there!',
            children: []
          }
        ]
      }
      expect(node.children).toHaveLength(1)
      expect(node.children[0].role).toBe('assistant')
    })
  })

  describe('CompleteChatDataResponse', () => {
    it('should contain all chat data', () => {
      const response: CompleteChatDataResponse = {
        chat_uuid: '123',
        title: 'Test Chat',
        system_prompt: 'You are a helpful assistant',
        messages: [
          {
            message_uuid: 'msg1',
            role: 'user',
            content: 'Hello'
          },
          {
            message_uuid: 'msg2',
            role: 'assistant',
            content: 'Hi!'
          }
        ],
        tree_structure: {
          uuid: 'root',
          role: 'system',
          content: '',
          children: []
        },
        metadata: {
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      }
      
      expect(response.chat_uuid).toBe('123')
      expect(response.messages).toHaveLength(2)
      expect(response.tree_structure).toBeDefined()
      expect(response.metadata).toBeDefined()
    })
  })

  describe('PaginatedResponse', () => {
    it('should have pagination info', () => {
      const response: PaginatedResponse = {
        items: [{ id: 1 }, { id: 2 }],
        total: 100,
        page: 1,
        limit: 20,
        pages: 5
      }
      
      expect(response.items).toHaveLength(2)
      expect(response.total).toBe(100)
      expect(response.pages).toBe(5)
    })
  })
})