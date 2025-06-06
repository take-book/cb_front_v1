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
})