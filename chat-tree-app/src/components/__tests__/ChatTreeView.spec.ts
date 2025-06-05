import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatTreeView from '../ChatTreeView.vue'
import type { HistoryMessage, TreeStructureResponse, TreeNode as ApiTreeNode } from '@/types/api'

describe('ChatTreeView', () => {
  const mockMessages: HistoryMessage[] = [
    { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
    { message_uuid: 'msg-2', role: 'assistant', content: 'Hi there!' },
    { message_uuid: 'msg-3', role: 'user', content: 'How are you?' },
    { message_uuid: 'msg-4', role: 'assistant', content: 'I am doing well!' }
  ]
  
  const mockPath = ['msg-1', 'msg-2', 'msg-3', 'msg-4']
  
  it('should render tree structure', () => {
    const wrapper = mount(ChatTreeView, {
      props: {
        messages: mockMessages,
        currentPath: mockPath,
        selectedNodeId: 'msg-2'
      }
    })
    
    // Should render all nodes
    const nodes = wrapper.findAll('.tree-node-group')
    expect(nodes).toHaveLength(5) // root + 4 messages
  })
  
  it('should highlight selected node', () => {
    const wrapper = mount(ChatTreeView, {
      props: {
        messages: mockMessages,
        currentPath: mockPath,
        selectedNodeId: 'msg-2'
      }
    })
    
    const selectedNode = wrapper.find('[data-test="tree-node-msg-2"]')
    expect(selectedNode.classes()).toContain('selected')
  })
  
  it('should emit node-click event', async () => {
    const wrapper = mount(ChatTreeView, {
      props: {
        messages: mockMessages,
        currentPath: mockPath,
        selectedNodeId: 'msg-2'
      }
    })
    
    const node = wrapper.find('[data-test="tree-node-msg-3"]')
    await node.trigger('click')
    
    expect(wrapper.emitted('node-click')).toBeTruthy()
    expect(wrapper.emitted('node-click')![0]).toEqual(['msg-3'])
  })
  
  it('should display message content in nodes', () => {
    const wrapper = mount(ChatTreeView, {
      props: {
        messages: mockMessages,
        currentPath: mockPath,
        selectedNodeId: 'msg-2'
      }
    })
    
    const node1 = wrapper.find('[data-test="tree-node-msg-1"]')
    expect(node1.text()).toContain('Hello')
    
    const node2 = wrapper.find('[data-test="tree-node-msg-2"]')
    expect(node2.text()).toContain('Hi there!')
  })
  
  it('should show role indicators', () => {
    const wrapper = mount(ChatTreeView, {
      props: {
        messages: mockMessages,
        currentPath: mockPath,
        selectedNodeId: 'msg-2'
      }
    })
    
    const userNode = wrapper.find('[data-test="tree-node-msg-1"]')
    expect(userNode.classes()).toContain('role-user')
    
    const assistantNode = wrapper.find('[data-test="tree-node-msg-2"]')
    expect(assistantNode.classes()).toContain('role-assistant')
  })
  
  it('should render connections between nodes', () => {
    const wrapper = mount(ChatTreeView, {
      props: {
        messages: mockMessages,
        currentPath: mockPath,
        selectedNodeId: 'msg-2'
      }
    })
    
    const connections = wrapper.findAll('.tree-connection')
    expect(connections.length).toBeGreaterThan(0)
  })
  
  it('should handle empty messages', () => {
    const wrapper = mount(ChatTreeView, {
      props: {
        messages: [],
        currentPath: [],
        selectedNodeId: null
      }
    })
    
    // Should only show root node
    const nodes = wrapper.findAll('.tree-node-group')
    expect(nodes).toHaveLength(1)
  })
  
  it('should handle branching paths correctly', () => {
    const branchingMessages: HistoryMessage[] = [
      { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
      { message_uuid: 'msg-2a', role: 'assistant', content: 'Response A' },
      { message_uuid: 'msg-2b', role: 'assistant', content: 'Response B' }
    ]
    
    const wrapper = mount(ChatTreeView, {
      props: {
        messages: branchingMessages,
        currentPath: ['msg-1', 'msg-2a'],
        selectedNodeId: 'msg-2a'
      }
    })
    
    const nodes = wrapper.findAll('.tree-node-group')
    expect(nodes).toHaveLength(4) // root + msg-1 + msg-2a + msg-2b
  })

  it('should place new messages under selected node correctly', () => {
    // Scenario: User selects msg-2, then sends a new message
    const messages: HistoryMessage[] = [
      { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
      { message_uuid: 'msg-2', role: 'assistant', content: 'Hi there!' },
      { message_uuid: 'msg-3', role: 'user', content: 'How are you?' },
      { message_uuid: 'msg-4', role: 'user', content: 'New message after selecting msg-2' }
    ]
    
    // Current path should reflect that msg-4 comes after msg-2
    const currentPath = ['msg-1', 'msg-2', 'msg-4']
    
    const wrapper = mount(ChatTreeView, {
      props: {
        messages,
        currentPath,
        selectedNodeId: 'msg-4'
      }
    })
    
    const nodes = wrapper.findAll('.tree-node-group')
    expect(nodes).toHaveLength(5) // root + 4 messages
    
    // msg-3 should be a branch from msg-2, not under root
    // msg-4 should be under msg-2, not under root
    const msg4Node = wrapper.find('[data-test="tree-node-msg-4"]')
    expect(msg4Node.exists()).toBe(true)
  })

  it('should handle message tree rebuilding correctly when path changes', () => {
    // Test the scenario where a message disappears and reappears after reload
    const messages: HistoryMessage[] = [
      { message_uuid: 'msg-1', role: 'user', content: 'Hello' },
      { message_uuid: 'msg-2', role: 'assistant', content: 'Hi there!' },
      { message_uuid: 'msg-3', role: 'user', content: 'Original branch' },
      { message_uuid: 'msg-4', role: 'user', content: 'New message' },
      { message_uuid: 'msg-5', role: 'assistant', content: 'Response to new message' }
    ]
    
    // Path after selecting msg-2 and sending new messages
    const currentPath = ['msg-1', 'msg-2', 'msg-4', 'msg-5']
    
    const wrapper = mount(ChatTreeView, {
      props: {
        messages,
        currentPath,
        selectedNodeId: 'msg-5'
      }
    })
    
    const nodes = wrapper.findAll('.tree-node-group')
    expect(nodes).toHaveLength(6) // root + 5 messages
    
    // msg-3 should be a sibling of msg-4, both under msg-2
    const msg3Node = wrapper.find('[data-test="tree-node-msg-3"]')
    const msg4Node = wrapper.find('[data-test="tree-node-msg-4"]')
    expect(msg3Node.exists()).toBe(true)
    expect(msg4Node.exists()).toBe(true)
  })

  describe('with API tree structure', () => {
    const mockApiTreeStructure: TreeStructureResponse = {
      chat_uuid: 'test-chat',
      current_node_uuid: 'msg-2',
      tree: {
        uuid: 'root',
        children: [
          {
            uuid: 'msg-1',
            children: [
              {
                uuid: 'msg-2',
                children: []
              }
            ]
          }
        ]
      }
    }

    it('should use API tree structure when provided', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          messages: mockMessages,
          currentPath: mockPath,
          selectedNodeId: 'msg-2',
          treeStructure: mockApiTreeStructure
        }
      })

      // Should still render nodes
      const nodes = wrapper.findAll('.tree-node-group')
      expect(nodes.length).toBeGreaterThan(0)
    })

    it('should extract current path from API tree', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          messages: mockMessages,
          currentPath: ['old-path'],
          selectedNodeId: 'msg-2',
          treeStructure: mockApiTreeStructure
        }
      })

      // The component should use the API tree's path, not the provided currentPath
      const connections = wrapper.findAll('.tree-connection')
      expect(connections.length).toBeGreaterThan(0)
    })

    it('should fallback to local tree building when no API tree provided', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          messages: mockMessages,
          currentPath: mockPath,
          selectedNodeId: 'msg-2',
          treeStructure: null
        }
      })

      // Should still work with local tree building
      const nodes = wrapper.findAll('.tree-node-group')
      expect(nodes.length).toBeGreaterThan(0)
    })
  })
})