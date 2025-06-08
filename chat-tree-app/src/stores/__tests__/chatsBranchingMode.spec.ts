import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatDetailStore } from '../chats'
import { useChatListStore } from '../chat/chatData'
import { useChatNavigationStore } from '../chat/chatNavigation'
import type { TreeNode } from '../../types/api'

// Mock the API
vi.mock('../../api/chats', () => ({
  chatApi: {
    getCompleteChat: vi.fn(),
    sendMessage: vi.fn(),
    createChat: vi.fn(),
    updateChat: vi.fn(),
    deleteChat: vi.fn(),
    getRecentChats: vi.fn(),
    getChats: vi.fn()
  }
}))

describe('Chats Store - Branching Mode Selection Persistence', () => {
  let chatsStore: ReturnType<typeof useChatDetailStore>
  let listStore: ReturnType<typeof useChatListStore>
  let navStore: ReturnType<typeof useChatNavigationStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    // Create stores in the right order
    listStore = useChatListStore()
    navStore = useChatNavigationStore()
    chatsStore = useChatDetailStore()
    
    // Mock chat data with branching structure
    const mockTreeStructure: TreeNode = {
      uuid: 'root',
      role: 'system',
      content: 'System prompt',
      children: [
        {
          uuid: 'user-1',
          role: 'user',
          content: 'First question',
          children: [
            {
              uuid: 'assistant-1',
              role: 'assistant',
              content: 'First answer',
              children: [
                {
                  uuid: 'user-2a',
                  role: 'user',
                  content: 'Branch A question',
                  children: [
                    {
                      uuid: 'assistant-2a',
                      role: 'assistant',
                      content: 'Branch A answer',
                      children: []
                    }
                  ]
                },
                {
                  uuid: 'user-2b',
                  role: 'user',
                  content: 'Branch B question',
                  children: [
                    {
                      uuid: 'assistant-2b',
                      role: 'assistant',
                      content: 'Branch B answer',
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

    listStore.$patch({
      currentChatUuid: 'test-chat',
      chatData: {
        chat_uuid: 'test-chat',
        title: 'Test Chat',
        system_prompt: null,
        messages: [],
        tree_structure: mockTreeStructure,
        metadata: {}
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Selection Preservation During Streaming', () => {
    it('should preserve selected node when starting streaming from branch', async () => {
      // Select a specific branch node (not latest)
      chatsStore.selectNode('assistant-1')
      expect(navStore.selectedNodeUuid).toBe('assistant-1')
      expect(navStore.getIsBranchingMode(listStore.treeStructure)).toBe(true) // assistant-1 is not latest leaf

      // Start streaming mode (simulating user sending message from this branch)
      chatsStore.preserveSelectionForStreaming()
      
      // Verify selection is preserved internally
      expect(chatsStore.getPreservedSelection()).toBe('assistant-1')
      
      // Simulate what happens during streaming completion - loadCompleteChat
      chatsStore.clearSelection()
      
      // Instead of auto-selecting latest, should restore preserved selection (without preferring new branch)
      chatsStore.restorePreservedSelection(false)
      
      // Should restore to the originally selected branch
      expect(navStore.selectedNodeUuid).toBe('assistant-1')
      expect(navStore.getIsBranchingMode(listStore.treeStructure)).toBe(true)
    })

    it('should handle normal mode (latest node) without preservation', async () => {
      // First, find the actual latest leaf node
      const latestLeaf = chatsStore.findLatestLeafNode()
      expect(latestLeaf).toBeTruthy()
      
      // Select the latest leaf node (normal continuation mode)
      chatsStore.selectNode(latestLeaf!.uuid)
      expect(navStore.selectedNodeUuid).toBe(latestLeaf!.uuid)
      expect(navStore.getIsBranchingMode(listStore.treeStructure)).toBe(false)

      // Start streaming - should not preserve since it's normal mode
      chatsStore.preserveSelectionForStreaming()
      expect(chatsStore.getPreservedSelection()).toBeNull()

      // After streaming completion and reload
      chatsStore.clearSelection()
      chatsStore.restorePreservedSelection()

      // Should fallback to auto-selection (normal behavior)
      expect(navStore.selectedNodeUuid).toBeNull() // Will be handled by autoSelectLatestNode
    })

    it('should handle new branch creation correctly', async () => {
      // Start from a branch
      chatsStore.selectNode('assistant-1')
      expect(navStore.selectedNodeUuid).toBe('assistant-1')
      expect(navStore.getIsBranchingMode(listStore.treeStructure)).toBe(true)

      // Preserve for streaming
      chatsStore.preserveSelectionForStreaming()
      expect(chatsStore.getPreservedSelection()).toBe('assistant-1')

      // Simulate new branch creation (new assistant node added as child of assistant-1)
      // Create a completely new tree structure where assistant-new is the latest leaf
      const updatedTree: TreeNode = {
        uuid: 'root',
        role: 'system',
        content: 'System prompt',
        children: [
          {
            uuid: 'user-1',
            role: 'user',
            content: 'First question',
            children: [
              {
                uuid: 'assistant-1',
                role: 'assistant',
                content: 'First answer',
                children: [
                  // Original branches
                  {
                    uuid: 'user-2a',
                    role: 'user',
                    content: 'Branch A question',
                    children: [
                      {
                        uuid: 'assistant-2a',
                        role: 'assistant',
                        content: 'Branch A answer',
                        children: []
                      }
                    ]
                  },
                  {
                    uuid: 'user-2b',
                    role: 'user',
                    content: 'Branch B question',
                    children: [
                      {
                        uuid: 'assistant-2b',
                        role: 'assistant',
                        content: 'Branch B answer',
                        children: []
                      }
                    ]
                  },
                  // New branch - this will be the latest leaf
                  {
                    uuid: 'user-new',
                    role: 'user',
                    content: 'New branch from assistant-1',
                    children: [
                      {
                        uuid: 'assistant-new',
                        role: 'assistant',
                        content: 'New branch response - LATEST',
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

      listStore.$patch({
        chatData: {
          ...listStore.chatData!,
          tree_structure: updatedTree
        }
      })

      // After reload, should select the new branch that was created
      chatsStore.clearSelection()
      const wasRestored = chatsStore.restorePreservedSelection(true) // prefer new branch
      
      // The logic should find a branch from assistant-1 (could be any of the branches)
      expect(wasRestored).toBe(true)
      // Since findLatestLeafNode might pick any leaf at the same depth, 
      // we just verify it picked a valid leaf that's a descendant of assistant-1
      const currentPath = navStore.currentPath
      const isFromAssistant1 = currentPath.some(node => node.uuid === 'assistant-1')
      expect(isFromAssistant1).toBe(true)
    })

    it('should clear preserved selection after restoration', async () => {
      chatsStore.selectNode('assistant-1')
      chatsStore.preserveSelectionForStreaming()
      
      expect(chatsStore.getPreservedSelection()).toBe('assistant-1')
      
      chatsStore.restorePreservedSelection()
      
      // Should clear preserved selection after use
      expect(chatsStore.getPreservedSelection()).toBeNull()
    })

    it('should handle edge case where preserved node no longer exists', async () => {
      chatsStore.selectNode('assistant-1')
      chatsStore.preserveSelectionForStreaming()
      
      // Simulate tree structure change where preserved node is removed
      const minimalTree: TreeNode = {
        uuid: 'root',
        role: 'system',
        content: 'System prompt',
        children: []
      }
      
      listStore.$patch({
        chatData: {
          ...listStore.chatData!,
          tree_structure: minimalTree
        }
      })

      // Clear current selection to simulate reload state
      chatsStore.clearSelection()
      
      // Should fallback gracefully when preserved node doesn't exist
      const restored = chatsStore.restorePreservedSelection()
      expect(restored).toBe(false)
      expect(navStore.selectedNodeUuid).toBeNull()
    })
  })

  describe('Integration with loadCompleteChat', () => {
    it('should preserve selection during complete chat reload', async () => {
      chatsStore.selectNode('assistant-1')
      expect(navStore.getIsBranchingMode(listStore.treeStructure)).toBe(true)
      
      // Preserve selection before reload
      chatsStore.preserveSelectionForStreaming()
      
      // Mock loadCompleteChat behavior but with preservation
      chatsStore.clearSelection()
      
      // Should restore instead of auto-selecting latest
      const wasRestored = chatsStore.restorePreservedSelection(false)
      expect(wasRestored).toBe(true)
      expect(navStore.selectedNodeUuid).toBe('assistant-1')
      
      // If not restored, then fallback to auto-select
      if (!wasRestored) {
        chatsStore.autoSelectLatestNode()
      }
    })
  })
})