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

/**
 * CRITICAL BEHAVIOR TEST: Branch Selection After Streaming
 * 
 * This test suite verifies the CORRECT behavior for node selection after branching and streaming.
 * This functionality has been broken multiple times during refactoring, so these tests serve as
 * the definitive specification for the expected behavior.
 * 
 * EXPECTED BEHAVIOR:
 * 1. User selects a node in the middle of conversation (not the latest leaf)
 * 2. User sends a message (creates a new branch from that node)
 * 3. AI responds to the new branch
 * 4. System should automatically select the NEW AI RESPONSE, not:
 *    - The original selected node (branch origin)
 *    - The deepest node in the entire tree
 *    - Any other node
 * 
 * WHY THIS MATTERS:
 * - Users expect to see the new AI response after branching
 * - Selecting the wrong node confuses the conversation flow
 * - This is core UX functionality for the branching feature
 */
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
    /**
     * CORE TEST: Verify that after branching and streaming, the NEW AI response is selected
     * 
     * SCENARIO:
     * - User has a conversation: System -> User1 -> AI1 -> User2 -> AI2
     * - User clicks on AI1 (middle of conversation) to branch from there
     * - User sends a new message, creating: AI1 -> UserNewBranch -> AINewBranch
     * - Expected: AINewBranch should be automatically selected
     * - Not expected: AI1 (original selection) or AI2 (deepest node) should NOT be selected
     */
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

      // STEP 1: User selects assistant-1 for branching (not the latest leaf)
      // This simulates clicking on a message in the middle of the conversation
      chatsStore.selectNode('assistant-1')
      expect(navStore.selectedNodeUuid).toBe('assistant-1')
      
      // STEP 2: Verify we're in branching mode
      // assistant-1 is not the latest leaf (assistant-2 is), so we should be in branching mode
      const latestLeaf = chatsStore.findLatestLeafNode()
      expect(latestLeaf?.uuid).toBe('assistant-2')
      expect(navStore.getIsBranchingMode(listStore.treeStructure)).toBe(true)

      // STEP 3: Preserve selection for streaming (simulates user sending a message)
      // This saves the branch origin point before the tree gets updated
      chatsStore.preserveSelectionForStreaming()
      expect(chatsStore.getPreservedSelection()).toBe('assistant-1')

      // STEP 4: Simulate new branch creation after streaming
      // This represents the tree structure after the API responds with the new branch
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
                        uuid: 'assistant-new-branch', // ← THIS IS THE CRITICAL NODE
                        role: 'assistant',            // This should be auto-selected after branching
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

      // STEP 5: Update the store with the new tree structure (simulates API response)
      listStore.$patch({
        chatData: {
          ...listStore.chatData!,
          tree_structure: updatedTree
        }
      })

      // STEP 6: Clear selection to simulate chat reload
      chatsStore.clearSelection()

      // STEP 7: Restore with preference for new branch (this is the critical logic)
      const wasRestored = chatsStore.restorePreservedSelection(true)

      // STEP 8: VERIFY CORRECT BEHAVIOR
      // The system should have automatically selected the NEW AI response
      expect(wasRestored).toBe(true)
      expect(navStore.selectedNodeUuid).toBe('assistant-new-branch') // ← CRITICAL ASSERTION
      
      // STEP 9: Verify the path contains the original branch point
      // This ensures we selected a node that's actually descended from our branch origin
      const path = navStore.currentPath
      const hasPreservedInPath = path.some(node => node.uuid === 'assistant-1')
      expect(hasPreservedInPath).toBe(true)
    })

    /**
     * FALLBACK TEST: When no new branch is actually created, fall back to original selection
     * 
     * SCENARIO:
     * - User selects a node for branching
     * - For some reason, no new branch gets created (network error, etc.)
     * - Expected: System should fall back to the original selected node
     */
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

    /**
     * INTEGRATION TEST: Verify the complete flow works with preferNewBranch=true
     * 
     * This test simulates the actual flow that happens in the application:
     * - User branches from a middle node
     * - System preserves the selection
     * - API creates a new branch
     * - System automatically selects the new AI response
     */
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
      expect(navStore.selectedNodeUuid).toBe('assistant-branch') // New AI response should be selected
    })
  })
})