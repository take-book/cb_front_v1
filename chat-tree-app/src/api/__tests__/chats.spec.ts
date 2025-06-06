import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock axios module
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })),
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

describe('Chat API Types', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should import types without errors', async () => {
    const types = await import('../../types/api')
    expect(types.isTreeNode).toBeDefined()
    expect(types.isHistoryMessage).toBeDefined()
  })

  it('should validate TreeNode type guard', async () => {
    const { isTreeNode } = await import('../../types/api')
    
    const validNode = {
      uuid: '123',
      role: 'user',
      content: 'Hello',
      children: []
    }
    
    const invalidNode = {
      uuid: '123',
      content: 'Hello'
    }
    
    expect(isTreeNode(validNode)).toBe(true)
    expect(isTreeNode(invalidNode)).toBe(false)
  })

  it('should validate HistoryMessage type guard', async () => {
    const { isHistoryMessage } = await import('../../types/api')
    
    const validMessage = {
      message_uuid: '123',
      role: 'user',
      content: 'Hello'
    }
    
    const invalidMessage = {
      uuid: '123',
      content: 'Hello'
    }
    
    expect(isHistoryMessage(validMessage)).toBe(true)
    expect(isHistoryMessage(invalidMessage)).toBe(false)
  })
})