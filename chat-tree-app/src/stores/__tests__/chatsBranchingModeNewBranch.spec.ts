import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatDetailStore } from '../chats'
import type { TreeNode } from '../../types/api'

describe('Chats Store - New Branch Selection', () => {
  let chatsStore: ReturnType<typeof useChatDetailStore>

  beforeEach(() => {
    setActivePinia(createPinia())
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

      chatsStore.$patch({
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
      expect(chatsStore.selectedNodeUuid).toBe('assistant-1')
      expect(chatsStore.isBranchingMode).toBe(true)

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

      chatsStore.$patch({
        chatData: {
          ...chatsStore.chatData!,
          tree_structure: updatedTree
        }
      })

      // Clear selection to simulate chat reload
      chatsStore.selectedNodeUuid = null

      // Restore with preference for new branch
      const wasRestored = chatsStore.restorePreservedSelection(true)

      // Should have selected the NEW AI response, not the original node
      expect(wasRestored).toBe(true)
      expect(chatsStore.selectedNodeUuid).toBe('assistant-new-branch')
      
      // Verify it's in the path from the preserved selection
      const path = chatsStore.getPathToNode('assistant-new-branch')
      const hasPreservedInPath = path.some(node => node.uuid === 'assistant-1')
      expect(hasPreservedInPath).toBe(true)
    })

    it('should fall back to original selection when no new branch is created', async () => {
      // Simple tree without new branch creation
      const simpleTree: TreeNode = {
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
                children: []
              }
            ]
          }
        ]
      }

      chatsStore.$patch({
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

      // Select assistant-1
      chatsStore.selectNode('assistant-1')
      chatsStore.preserveSelectionForStreaming()

      // Clear selection
      chatsStore.selectedNodeUuid = null

      // Restore with new branch preference, but no new branch exists
      const wasRestored = chatsStore.restorePreservedSelection(true)

      // Should fall back to original selection
      expect(wasRestored).toBe(true)
      expect(chatsStore.selectedNodeUuid).toBe('assistant-1')
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

      chatsStore.$patch({
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
      chatsStore.selectedNodeUuid = null
      const wasRestored = chatsStore.restorePreservedSelection(true)

      expect(wasRestored).toBe(true)
      expect(chatsStore.selectedNodeUuid).toBe('assistant-branch') // New AI response
    })
  })
})