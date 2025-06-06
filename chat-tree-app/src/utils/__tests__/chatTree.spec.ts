import { describe, it, expect } from 'vitest'
import { buildChatTree, calculateTreeLayout, findNodePath } from '../chatTree'
import { getBranchConversationThread } from '../treeHelpers'
import type { HistoryMessage, TreeNode } from '@/types/api'

describe('chatTree', () => {
  describe('buildChatTree', () => {
    it('should build a linear tree for sequential messages', () => {
      const messages: HistoryMessage[] = [
        { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
        { message_uuid: 'msg-2', role: 'assistant', content: 'Hi there!' },
        { message_uuid: 'msg-3', role: 'user', content: 'How are you?' }
      ]
      const currentPath = ['msg-1', 'msg-2', 'msg-3']
      
      const tree = buildChatTree(messages, currentPath)
      
      expect(tree.id).toBe('root')
      expect(tree.children).toHaveLength(1)
      
      // Check linear structure
      let currentNode = tree.children[0]
      expect(currentNode.id).toBe('msg-1')
      expect(currentNode.children).toHaveLength(1)
      
      currentNode = currentNode.children[0]
      expect(currentNode.id).toBe('msg-2')
      expect(currentNode.children).toHaveLength(1)
      
      currentNode = currentNode.children[0]
      expect(currentNode.id).toBe('msg-3')
      expect(currentNode.children).toHaveLength(0)
    })

    it('should handle branching correctly when messages are not in current path', () => {
      const messages: HistoryMessage[] = [
        { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
        { message_uuid: 'msg-2', role: 'assistant', content: 'Hi there!' },
        { message_uuid: 'msg-3', role: 'user', content: 'Original branch' },
        { message_uuid: 'msg-4', role: 'user', content: 'New message after selecting msg-2' }
      ]
      // User selected msg-2 and sent msg-4
      const currentPath = ['msg-1', 'msg-2', 'msg-4']
      
      const tree = buildChatTree(messages, currentPath)
      
      // Should have proper tree structure
      expect(tree.children).toHaveLength(1) // msg-1
      
      const msg1 = tree.children[0]
      expect(msg1.id).toBe('msg-1')
      expect(msg1.children).toHaveLength(1) // msg-2
      
      const msg2 = msg1.children[0]
      expect(msg2.id).toBe('msg-2')
      expect(msg2.children).toHaveLength(2) // msg-3 and msg-4
      
      // Check both branches exist under msg-2
      const childIds = msg2.children.map(child => child.id)
      expect(childIds).toContain('msg-3')
      expect(childIds).toContain('msg-4')
    })

    it('should place orphaned messages under their logical parent', () => {
      // Complex scenario: multiple branches and orphaned messages
      const messages: HistoryMessage[] = [
        { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
        { message_uuid: 'msg-2', role: 'assistant', content: 'Response A' },
        { message_uuid: 'msg-3', role: 'assistant', content: 'Response B to msg-1' },
        { message_uuid: 'msg-4', role: 'user', content: 'Follow up to response A' },
        { message_uuid: 'msg-5', role: 'user', content: 'Follow up to response B' }
      ]
      const currentPath = ['msg-1', 'msg-2', 'msg-4']
      
      const tree = buildChatTree(messages, currentPath)
      
      // msg-1 should have 2 children: msg-2 and msg-3
      const msg1 = tree.children[0]
      expect(msg1.children).toHaveLength(2)
      
      // Find msg-2 and msg-3
      const msg2Node = msg1.children.find(child => child.id === 'msg-2')
      const msg3Node = msg1.children.find(child => child.id === 'msg-3')
      
      expect(msg2Node).toBeDefined()
      expect(msg3Node).toBeDefined()
      
      // msg-2 should have msg-4 as child
      expect(msg2Node!.children).toHaveLength(1)
      expect(msg2Node!.children[0].id).toBe('msg-4')
      
      // msg-3 should have msg-5 as child
      expect(msg3Node!.children).toHaveLength(1)
      expect(msg3Node!.children[0].id).toBe('msg-5')
    })
  })

  describe('findNodePath', () => {
    it('should find correct path to target node', () => {
      const messages: HistoryMessage[] = [
        { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
        { message_uuid: 'msg-2', role: 'assistant', content: 'Hi!' },
        { message_uuid: 'msg-3', role: 'user', content: 'How are you?' }
      ]
      const tree = buildChatTree(messages, ['msg-1', 'msg-2', 'msg-3'])
      
      const path = findNodePath(tree, 'msg-3')
      expect(path).toEqual(['msg-1', 'msg-2', 'msg-3'])
    })

    it('should return empty path for non-existent node', () => {
      const messages: HistoryMessage[] = [
        { message_uuid: 'msg-1', role: 'user', content: 'Hello' }
      ]
      const tree = buildChatTree(messages, ['msg-1'])
      
      const path = findNodePath(tree, 'non-existent')
      expect(path).toEqual([])
    })
  })

  describe('calculateTreeLayout', () => {
    it('should calculate positions for all nodes', () => {
      const messages: HistoryMessage[] = [
        { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
        { message_uuid: 'msg-2', role: 'assistant', content: 'Hi!' }
      ]
      const tree = buildChatTree(messages, ['msg-1', 'msg-2'])
      
      const layout = calculateTreeLayout(tree, 100, 50, 20, 30)
      
      expect(layout.nodes).toHaveLength(3) // root + 2 messages
      expect(layout.width).toBeGreaterThan(0)
      expect(layout.height).toBeGreaterThan(0)
      
      // All nodes should have positions
      layout.nodes.forEach(node => {
        expect(node.x).toBeDefined()
        expect(node.y).toBeDefined()
      })
    })
  })

  describe('getBranchConversationThread', () => {
    it('should extract conversation thread for selected node', () => {
      const tree: TreeNode = {
        uuid: 'root',
        role: 'system', 
        content: 'Start',
        children: [
          {
            uuid: 'msg-1',
            role: 'user',
            content: 'Hello',
            children: [
              {
                uuid: 'msg-2',
                role: 'assistant',
                content: 'Hi there',
                children: []
              }
            ]
          }
        ]
      }

      const messages = [
        { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
        { message_uuid: 'msg-2', role: 'assistant', content: 'Hi there' },
        { message_uuid: 'msg-3', role: 'user', content: 'Other branch' }
      ]

      const thread = getBranchConversationThread(tree, messages, 'msg-2')
      
      expect(thread).toHaveLength(2)
      expect(thread[0].message_uuid).toBe('msg-1')
      expect(thread[1].message_uuid).toBe('msg-2')
    })

    it('should return empty array for null tree', () => {
      const messages = [
        { message_uuid: 'msg-1', role: 'user', content: 'Hello' }
      ]

      const thread = getBranchConversationThread(null, messages, 'msg-1')
      
      expect(thread).toHaveLength(0)
    })

    it('should return empty array for empty messages', () => {
      const tree: TreeNode = {
        uuid: 'root',
        role: 'system',
        content: 'Start',
        children: []
      }

      const thread = getBranchConversationThread(tree, [], null)
      
      expect(thread).toHaveLength(0)
    })
  })
})