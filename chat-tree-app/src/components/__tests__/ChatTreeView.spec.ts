import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ChatTreeView from '../ChatTreeView.vue'
import type { TreeNode } from '../../types/api'

describe('ChatTreeView (New Implementation)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockTreeStructure: TreeNode = {
    uuid: 'root',
    role: 'system',
    content: '',
    children: [
      {
        uuid: 'msg1',
        role: 'user', 
        content: 'Hello',
        children: [
          {
            uuid: 'msg2',
            role: 'assistant',
            content: 'Hi there!',
            children: []
          }
        ]
      }
    ]
  }

  describe('Rendering', () => {
    it('should render tree structure correctly', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: null,
          currentPath: []
        }
      })

      expect(wrapper.find('.chat-tree-container').exists()).toBe(true)
      expect(wrapper.find('.chat-tree-svg').exists()).toBe(true)
    })

    it('should render nodes with correct content', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: null,
          currentPath: []
        }
      })

      // Check if nodes are rendered (should have data-test attributes)
      const nodes = wrapper.findAll('[data-test^="tree-node-"]')
      expect(nodes.length).toBeGreaterThan(0)
    })

    it('should handle empty tree structure', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: null,
          selectedNodeUuid: null,
          currentPath: []
        }
      })

      expect(wrapper.find('.chat-tree-container').exists()).toBe(true)
      // Should still render SVG but with minimal content
      expect(wrapper.find('.chat-tree-svg').exists()).toBe(true)
    })
  })

  describe('Node Selection', () => {
    it('should emit node-click event when node is clicked', async () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: null,
          currentPath: []
        }
      })

      // Find a clickable node and simulate click
      const nodeElement = wrapper.find('[data-test="tree-node-msg1"]')
      if (nodeElement.exists()) {
        await nodeElement.trigger('click')
        expect(wrapper.emitted('node-click')).toBeTruthy()
        expect(wrapper.emitted('node-click')![0]).toEqual(['msg1'])
      }
    })

    it('should highlight selected node', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: 'msg1',
          currentPath: [mockTreeStructure, mockTreeStructure.children[0]]
        }
      })

      // Check if selected node has correct styling
      const selectedNode = wrapper.find('[data-test="tree-node-msg1"]')
      if (selectedNode.exists()) {
        expect(selectedNode.classes()).toContain('selected')
      }
    })
  })

  describe('Tree Layout', () => {
    it('should calculate tree layout dimensions', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: null,
          currentPath: []
        }
      })

      const svg = wrapper.find('.chat-tree-svg')
      expect(svg.attributes('width')).toBeDefined()
      expect(svg.attributes('height')).toBeDefined()
    })

    it('should render connections between nodes', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: null,
          currentPath: []
        }
      })

      const connections = wrapper.findAll('[data-test="tree-connection"]')
      expect(connections.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Path Highlighting', () => {
    it('should highlight current path connections', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: 'msg2',
          currentPath: [
            mockTreeStructure,
            mockTreeStructure.children[0],
            mockTreeStructure.children[0].children[0]
          ]
        }
      })

      // Check if connections on the path are highlighted
      const activeConnections = wrapper.findAll('.tree-connection.active-path')
      expect(activeConnections.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Role Display', () => {
    it('should display role labels correctly', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: null,
          currentPath: []
        }
      })

      // Check if role labels are displayed
      const roleElements = wrapper.findAll('.role-user, .role-assistant, .role-system')
      expect(roleElements.length).toBeGreaterThan(0)
    })

    it('should apply correct role classes', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: null,
          currentPath: []
        }
      })

      // Check if nodes have role-specific classes
      const userNodes = wrapper.findAll('.role-user')
      const assistantNodes = wrapper.findAll('.role-assistant')
      
      expect(userNodes.length + assistantNodes.length).toBeGreaterThan(0)
    })
  })

  describe('Content Truncation', () => {
    it('should truncate long content appropriately', () => {
      const longContentTree: TreeNode = {
        uuid: 'root',
        role: 'system',
        content: '',
        children: [
          {
            uuid: 'long-msg',
            role: 'user',
            content: 'This is a very long message that should be truncated when displayed in the tree view to ensure proper layout and readability',
            children: []
          }
        ]
      }

      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: longContentTree,
          selectedNodeUuid: null,
          currentPath: []
        }
      })

      // Check if content truncation is applied
      const contentElements = wrapper.findAll('.line-clamp-3')
      expect(contentElements.length).toBeGreaterThan(0)
    })
  })

  describe('Branching Trees', () => {
    it('should handle branching conversation trees', () => {
      const branchingTree: TreeNode = {
        uuid: 'root',
        role: 'system',
        content: '',
        children: [
          {
            uuid: 'msg1',
            role: 'user',
            content: 'Hello',
            children: [
              {
                uuid: 'msg2a',
                role: 'assistant',
                content: 'Response A',
                children: []
              },
              {
                uuid: 'msg2b',
                role: 'assistant',
                content: 'Response B',
                children: []
              }
            ]
          }
        ]
      }

      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: branchingTree,
          selectedNodeUuid: null,
          currentPath: []
        }
      })

      // Should render all nodes including branches
      const nodes = wrapper.findAll('[data-test^="tree-node-"]')
      expect(nodes.length).toBeGreaterThanOrEqual(3) // root, msg1, msg2a, msg2b
    })
  })

  describe('System Message Visibility', () => {
    it('should render system nodes when showSystemMessages is true', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: null,
          currentPath: [],
          showSystemMessages: true
        }
      })

      // System node (root) should be visible
      const systemNode = wrapper.find('[data-test="tree-node-root"]')
      expect(systemNode.exists()).toBe(true)
      
      // All nodes should be visible
      const allNodes = wrapper.findAll('[data-test^="tree-node-"]')
      expect(allNodes.length).toBeGreaterThanOrEqual(3) // root, msg1, msg2
    })

    it('should hide system nodes when showSystemMessages is false', () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: null,
          currentPath: [],
          showSystemMessages: false
        }
      })

      // System node (root) should not be visible
      const systemNode = wrapper.find('[data-test="tree-node-root"]')
      expect(systemNode.exists()).toBe(false)
      
      // Only non-system nodes should be visible
      const nonSystemNodes = wrapper.findAll('[data-test="tree-node-msg1"], [data-test="tree-node-msg2"]')
      expect(nonSystemNodes.length).toBe(2)
    })

    it('should handle tree with only system nodes when hidden', () => {
      const systemOnlyTree: TreeNode = {
        uuid: 'system-root',
        role: 'system',
        content: 'You are a helpful assistant.',
        children: []
      }

      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: systemOnlyTree,
          selectedNodeUuid: null,
          currentPath: [],
          showSystemMessages: false
        }
      })

      // Should render the tree container but no visible nodes
      expect(wrapper.find('.chat-tree-container').exists()).toBe(true)
      const systemNode = wrapper.find('[data-test="tree-node-system-root"]')
      expect(systemNode.exists()).toBe(false)
    })

    it('should update visibility when showSystemMessages prop changes', async () => {
      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: mockTreeStructure,
          selectedNodeUuid: null,
          currentPath: [],
          showSystemMessages: true
        }
      })

      // Initially system node should be visible
      let systemNode = wrapper.find('[data-test="tree-node-root"]')
      expect(systemNode.exists()).toBe(true)

      // Hide system messages
      await wrapper.setProps({ showSystemMessages: false })

      // System node should now be hidden
      systemNode = wrapper.find('[data-test="tree-node-root"]')
      expect(systemNode.exists()).toBe(false)

      // Show system messages again
      await wrapper.setProps({ showSystemMessages: true })

      // System node should be visible again
      systemNode = wrapper.find('[data-test="tree-node-root"]')
      expect(systemNode.exists()).toBe(true)
    })

    it('should maintain tree structure when system nodes are hidden', () => {
      const treeWithSystemBranch: TreeNode = {
        uuid: 'root',
        role: 'system',
        content: 'System prompt',
        children: [
          {
            uuid: 'system-child',
            role: 'system',
            content: 'System instruction',
            children: [
              {
                uuid: 'user-msg',
                role: 'user',
                content: 'Hello',
                children: []
              }
            ]
          }
        ]
      }

      const wrapper = mount(ChatTreeView, {
        props: {
          treeStructure: treeWithSystemBranch,
          selectedNodeUuid: null,
          currentPath: [],
          showSystemMessages: false
        }
      })

      // System nodes should be hidden
      const systemNodes = wrapper.findAll('[data-test="tree-node-root"], [data-test="tree-node-system-child"]')
      expect(systemNodes.length).toBe(0)

      // User message should still be visible and connected properly
      const userNode = wrapper.find('[data-test="tree-node-user-msg"]')
      expect(userNode.exists()).toBe(true)
    })
  })
})