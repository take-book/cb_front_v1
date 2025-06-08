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

describe('Chats Store - New Branch Selection', () => {
  let chatsStore: ReturnType<typeof useChatDetailStore>
  let listStore: ReturnType<typeof useChatListStore>
  let navStore: ReturnType<typeof useChatNavigationStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    // Create stores in the right order
    listStore = useChatListStore()
    navStore = useChatNavigationStore()
    chatsStore = useChatDetailStore()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('New Branch Selection After Streaming', () => {
    it('should select the newly created AI response after branching, not the original selected node', async () => {
      // Create a simple tree structure for branching
      const originalTree: TreeNode = {
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
                    uuid: 'user-2',
                    role: 'user',
                    content: 'Follow-up question',
                    children: [
                      {
                        uuid: 'assistant-2',
                        role: 'assistant',
                        content: 'Follow-up answer',
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
          tree_structure: originalTree,
          metadata: {}
        }
      })

      // User selects assistant-1 for branching (not the latest leaf)
      chatsStore.selectNode('assistant-1')
      expect(navStore.selectedNodeUuid).toBe('assistant-1')
      
      // Check if we're in branching mode - assistant-1 is not the latest leaf (assistant-2 is)
      const latestLeaf = chatsStore.findLatestLeafNode()
      expect(latestLeaf?.uuid).toBe('assistant-2')
      expect(navStore.getIsBranchingMode(listStore.treeStructure)).toBe(true)

      // Preserve selection for streaming (simulating the user sending a message)
      chatsStore.preserveSelectionForStreaming()
      expect(chatsStore.getPreservedSelection()).toBe('assistant-1')

      // Simulate new branch creation after streaming
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
                  // Original branch
                  {
                    uuid: 'user-2',
                    role: 'user',
                    content: 'Follow-up question',
                    children: [
                      {
                        uuid: 'assistant-2',
                        role: 'assistant',
                        content: 'Follow-up answer',
                        children: []
                      }
                    ]
                  },
                  // NEW BRANCH: User's new message from assistant-1
                  {
                    uuid: 'user-new-branch',
                    role: 'user',
                    content: 'New branch question',
                    children: [
                      {
                        uuid: 'assistant-new-branch', // This should be selected
                        role: 'assistant',
                        content: 'New branch AI response',
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

      // Clear selection to simulate chat reload
      chatsStore.clearSelection()

      // Restore with preference for new branch
      const wasRestored = chatsStore.restorePreservedSelection(true)

      // Should have selected the NEW AI response, not the original node
      expect(wasRestored).toBe(true)
      expect(navStore.selectedNodeUuid).toBe('assistant-new-branch')
      
      // Verify it's in the path from the preserved selection
      const path = navStore.currentPath
      const hasPreservedInPath = path.some(node => node.uuid === 'assistant-1')
      expect(hasPreservedInPath).toBe(true)
    })

    it('should fall back to original selection when no new branch is created', async () => {
      // Tree where we have multiple leaf nodes at different depths
      const simpleTree: TreeNode = {
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
                children: []  // No children - this is a leaf
              }
            ]
          },
          {
            uuid: 'user-2',
            role: 'user',
            content: 'Second question',
            children: [
              {
                uuid: 'assistant-2',
                role: 'assistant',
                content: 'Second answer',
                children: []  // This is the latest leaf by UUID
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
          tree_structure: simpleTree,
          metadata: {}
        }
      })

      // Select assistant-1 (not the latest leaf, so we're in branching mode)
      chatsStore.selectNode('assistant-1')
      expect(navStore.getIsBranchingMode(listStore.treeStructure)).toBe(true)
      
      chatsStore.preserveSelectionForStreaming()

      // Clear selection
      chatsStore.clearSelection()

      // DON'T modify the tree - simulate case where no new messages were added
      // Restore with new branch preference, but no new branch exists
      const wasRestored = chatsStore.restorePreservedSelection(true)

      // Should fall back to original selection since no new children were added to assistant-1
      expect(wasRestored).toBe(true)
      expect(navStore.selectedNodeUuid).toBe('assistant-1')
    })

    it('should work correctly when called with preferNewBranch=true', async () => {
      // This test simulates the real flow
      const mockTree: TreeNode = {
        uuid: 'root',
        role: 'system',
        content: 'System prompt',
        children: [
          {
            uuid: 'user-1',
            role: 'user',
            content: 'Question',
            children: [
              {
                uuid: 'assistant-1',
                role: 'assistant',
                content: 'Answer',
                children: [
                  {
                    uuid: 'user-branch',
                    role: 'user',
                    content: 'Branch question',
                    children: [
                      {
                        uuid: 'assistant-branch',
                        role: 'assistant',
                        content: 'Branch answer',
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
          tree_structure: mockTree,
          metadata: {}
        }
      })

      // Select and preserve
      chatsStore.selectNode('assistant-1')
      chatsStore.preserveSelectionForStreaming()

      // Clear selection and restore with new branch preference
      chatsStore.clearSelection()
      const wasRestored = chatsStore.restorePreservedSelection(true)

      expect(wasRestored).toBe(true)
      expect(navStore.selectedNodeUuid).toBe('assistant-branch') // New AI response
    })
  })
})