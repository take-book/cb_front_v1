import { describe, it, expect } from 'vitest'
import { 
  convertApiTreeToRenderTree, 
  extractCurrentPathFromApiTree,
  isNodeOnCurrentPath,
  findNodeInApiTree
} from '../apiTreeConverter'
import type { TreeNode as ApiTreeNode, HistoryMessage } from '@/types/api'

describe('apiTreeConverter', () => {
  const mockMessages: HistoryMessage[] = [
    { message_uuid: 'root', role: 'system', content: 'Chat Start' },
    { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
    { message_uuid: 'msg-2', role: 'assistant', content: 'Hi there!' },
    { message_uuid: 'msg-3', role: 'user', content: 'How are you?' },
    { message_uuid: 'msg-4', role: 'assistant', content: 'I am good!' }
  ]

  const mockApiTree: ApiTreeNode = {
    uuid: 'root',
    children: [
      {
        uuid: 'msg-1',
        children: [
          {
            uuid: 'msg-2',
            children: [
              {
                uuid: 'msg-3',
                children: [
                  {
                    uuid: 'msg-4',
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

  describe('convertApiTreeToRenderTree', () => {
    it('should convert API tree to render tree format', () => {
      const renderTree = convertApiTreeToRenderTree(
        mockApiTree,
        mockMessages,
        'msg-4',
        ['msg-1', 'msg-2', 'msg-3', 'msg-4']
      )

      expect(renderTree.id).toBe('root')
      expect(renderTree.children).toHaveLength(1)
      
      const msg1 = renderTree.children[0]
      expect(msg1.id).toBe('msg-1')
      expect(msg1.message.content).toBe('Hello')
      expect(msg1.level).toBe(1)
      expect(msg1.parent).toBe(renderTree)
    })

    it('should handle nested tree structure correctly', () => {
      const renderTree = convertApiTreeToRenderTree(
        mockApiTree,
        mockMessages,
        'msg-4',
        ['msg-1', 'msg-2', 'msg-3', 'msg-4']
      )

      // Follow the path: root -> msg-1 -> msg-2 -> msg-3 -> msg-4
      let currentNode = renderTree
      expect(currentNode.id).toBe('root')
      
      currentNode = currentNode.children[0]
      expect(currentNode.id).toBe('msg-1')
      expect(currentNode.level).toBe(1)
      
      currentNode = currentNode.children[0]
      expect(currentNode.id).toBe('msg-2')
      expect(currentNode.level).toBe(2)
      
      currentNode = currentNode.children[0]
      expect(currentNode.id).toBe('msg-3')
      expect(currentNode.level).toBe(3)
      
      currentNode = currentNode.children[0]
      expect(currentNode.id).toBe('msg-4')
      expect(currentNode.level).toBe(4)
      expect(currentNode.children).toHaveLength(0)
    })

    it('should handle missing messages gracefully', () => {
      const limitedMessages = mockMessages.slice(0, 3) // Only first 3 messages
      
      const renderTree = convertApiTreeToRenderTree(
        mockApiTree,
        limitedMessages,
        'msg-4',
        ['msg-1', 'msg-2', 'msg-3', 'msg-4']
      )

      // Should still build the tree, with placeholder for missing message
      const msg4Node = renderTree.children[0].children[0].children[0].children[0]
      expect(msg4Node.id).toBe('msg-4')
      expect(msg4Node.message.content).toBe('Unknown message')
      expect(msg4Node.message.role).toBe('system')
    })
  })

  describe('extractCurrentPathFromApiTree', () => {
    it('should extract correct path to target node', () => {
      const path = extractCurrentPathFromApiTree(mockApiTree, 'msg-4')
      expect(path).toEqual(['msg-1', 'msg-2', 'msg-3', 'msg-4'])
    })

    it('should extract path to intermediate node', () => {
      const path = extractCurrentPathFromApiTree(mockApiTree, 'msg-2')
      expect(path).toEqual(['msg-1', 'msg-2'])
    })

    it('should return empty path for non-existent node', () => {
      const path = extractCurrentPathFromApiTree(mockApiTree, 'non-existent')
      expect(path).toEqual([])
    })

    it('should handle root node correctly', () => {
      const path = extractCurrentPathFromApiTree(mockApiTree, 'root')
      expect(path).toEqual([]) // Root is filtered out
    })
  })

  describe('isNodeOnCurrentPath', () => {
    it('should return true for nodes on current path', () => {
      const currentPath = ['msg-1', 'msg-2', 'msg-3']
      
      expect(isNodeOnCurrentPath('msg-1', currentPath)).toBe(true)
      expect(isNodeOnCurrentPath('msg-2', currentPath)).toBe(true)
      expect(isNodeOnCurrentPath('msg-3', currentPath)).toBe(true)
    })

    it('should return false for nodes not on current path', () => {
      const currentPath = ['msg-1', 'msg-2', 'msg-3']
      
      expect(isNodeOnCurrentPath('msg-4', currentPath)).toBe(false)
      expect(isNodeOnCurrentPath('non-existent', currentPath)).toBe(false)
    })
  })

  describe('findNodeInApiTree', () => {
    it('should find existing nodes', () => {
      const node = findNodeInApiTree(mockApiTree, 'msg-3')
      expect(node).toBeDefined()
      expect(node?.uuid).toBe('msg-3')
    })

    it('should return null for non-existent nodes', () => {
      const node = findNodeInApiTree(mockApiTree, 'non-existent')
      expect(node).toBeNull()
    })

    it('should find root node', () => {
      const node = findNodeInApiTree(mockApiTree, 'root')
      expect(node).toBeDefined()
      expect(node?.uuid).toBe('root')
    })
  })

  describe('branching scenarios', () => {
    it('should handle tree with multiple branches', () => {
      const branchingApiTree: ApiTreeNode = {
        uuid: 'root',
        children: [
          {
            uuid: 'msg-1',
            children: [
              {
                uuid: 'msg-2a',
                children: [
                  { uuid: 'msg-3a', children: [] }
                ]
              },
              {
                uuid: 'msg-2b',
                children: [
                  { uuid: 'msg-3b', children: [] }
                ]
              }
            ]
          }
        ]
      }

      const branchingMessages = [
        { message_uuid: 'root', role: 'system', content: 'Chat Start' },
        { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
        { message_uuid: 'msg-2a', role: 'assistant', content: 'Response A' },
        { message_uuid: 'msg-2b', role: 'assistant', content: 'Response B' },
        { message_uuid: 'msg-3a', role: 'user', content: 'Follow A' },
        { message_uuid: 'msg-3b', role: 'user', content: 'Follow B' }
      ]

      const renderTree = convertApiTreeToRenderTree(
        branchingApiTree,
        branchingMessages,
        'msg-3a',
        ['msg-1', 'msg-2a', 'msg-3a']
      )

      const msg1 = renderTree.children[0]
      expect(msg1.children).toHaveLength(2) // Two branches from msg-1
      
      const msg2a = msg1.children[0]
      const msg2b = msg1.children[1]
      
      expect(msg2a.id).toBe('msg-2a')
      expect(msg2b.id).toBe('msg-2b')
      
      expect(msg2a.children).toHaveLength(1)
      expect(msg2b.children).toHaveLength(1)
    })
  })
})