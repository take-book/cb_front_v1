import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatApi } from '../api/chats'
import type { 
  CompleteChatDataResponse, 
  TreeNode, 
  HistoryMessage,
  MessageResponse 
} from '../types/api'

export const useChatStore = defineStore('chat', () => {
  // State
  const currentChatUuid = ref<string | null>(null)
  const chatData = ref<CompleteChatDataResponse | null>(null)
  const selectedNodeUuid = ref<string | null>(null)
  const currentPath = ref<TreeNode[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed getters
  const treeStructure = computed((): TreeNode | null => {
    return chatData.value?.tree_structure || null
  })

  const messages = computed((): HistoryMessage[] => {
    return chatData.value?.messages || []
  })

  const selectedNode = computed((): TreeNode | null => {
    if (!selectedNodeUuid.value || !treeStructure.value) return null
    return findNodeInTree(selectedNodeUuid.value)
  })

  const isBranchingMode = computed((): boolean => {
    if (!selectedNode.value) return false
    return !isLeafNode(selectedNode.value.uuid)
  })

  const chatTitle = computed((): string => {
    return chatData.value?.title || 'New Chat'
  })

  const systemPrompt = computed((): string | null => {
    return chatData.value?.system_prompt || null
  })

  // Actions
  async function loadCompleteChat(chatUuid: string) {
    isLoading.value = true
    error.value = null
    
    try {
      const data = await chatApi.getCompleteChat(chatUuid)
      chatData.value = data
      currentChatUuid.value = chatUuid
      
      // Reset selection and path
      selectedNodeUuid.value = null
      currentPath.value = []
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load chat'
      console.error('Failed to load chat:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function sendMessage(content: string): Promise<MessageResponse | null> {
    if (!currentChatUuid.value) {
      error.value = 'No chat selected'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await chatApi.sendMessage(currentChatUuid.value, content)
      
      // Reload complete chat data to get updated tree structure
      await loadCompleteChat(currentChatUuid.value)
      
      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to send message'
      console.error('Failed to send message:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function createNewChat(initialMessage?: string): Promise<string | null> {
    isLoading.value = true
    error.value = null

    try {
      const response = await chatApi.createChat(initialMessage)
      
      // Load the new chat
      await loadCompleteChat(response.chat_uuid)
      
      return response.chat_uuid
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create chat'
      console.error('Failed to create chat:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateChatMetadata(title?: string, systemPrompt?: string) {
    if (!currentChatUuid.value) {
      error.value = 'No chat selected'
      return
    }

    try {
      await chatApi.updateChat(currentChatUuid.value, {
        title,
        system_prompt: systemPrompt
      })
      
      // Reload to get updated metadata
      await loadCompleteChat(currentChatUuid.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update chat'
      console.error('Failed to update chat:', err)
    }
  }

  // Navigation functions
  function selectNode(nodeUuid: string) {
    selectedNodeUuid.value = nodeUuid
    currentPath.value = getPathToNode(nodeUuid)
  }

  function clearSelection() {
    selectedNodeUuid.value = null
    currentPath.value = []
  }

  // Tree traversal utilities
  function findNodeInTree(nodeUuid: string, node?: TreeNode): TreeNode | null {
    const searchNode = node || treeStructure.value
    if (!searchNode) return null

    if (searchNode.uuid === nodeUuid) {
      return searchNode
    }

    for (const child of searchNode.children) {
      const found = findNodeInTree(nodeUuid, child)
      if (found) return found
    }

    return null
  }

  function getPathToNode(nodeUuid: string, node?: TreeNode, path: TreeNode[] = []): TreeNode[] {
    const searchNode = node || treeStructure.value
    if (!searchNode) return []

    const currentPath = [...path, searchNode]

    if (searchNode.uuid === nodeUuid) {
      return currentPath
    }

    for (const child of searchNode.children) {
      const foundPath = getPathToNode(nodeUuid, child, currentPath)
      if (foundPath.length > 0) return foundPath
    }

    return []
  }

  function isLeafNode(nodeUuid: string): boolean {
    const node = findNodeInTree(nodeUuid)
    return node ? node.children.length === 0 : false
  }

  function getNodeChildren(nodeUuid: string): TreeNode[] {
    const node = findNodeInTree(nodeUuid)
    return node ? node.children : []
  }

  function getNodeParent(nodeUuid: string): TreeNode | null {
    if (!treeStructure.value) return null

    function searchForParent(searchNode: TreeNode): TreeNode | null {
      for (const child of searchNode.children) {
        if (child.uuid === nodeUuid) {
          return searchNode
        }
        const found = searchForParent(child)
        if (found) return found
      }
      return null
    }

    return searchForParent(treeStructure.value)
  }

  // Reset store
  function reset() {
    currentChatUuid.value = null
    chatData.value = null
    selectedNodeUuid.value = null
    currentPath.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    currentChatUuid,
    chatData,
    selectedNodeUuid,
    currentPath,
    isLoading,
    error,

    // Computed
    treeStructure,
    messages,
    selectedNode,
    isBranchingMode,
    chatTitle,
    systemPrompt,

    // Actions
    loadCompleteChat,
    sendMessage,
    createNewChat,
    updateChatMetadata,
    selectNode,
    clearSelection,
    reset,

    // Tree utilities
    findNodeInTree,
    getPathToNode,
    isLeafNode,
    getNodeChildren,
    getNodeParent
  }
})