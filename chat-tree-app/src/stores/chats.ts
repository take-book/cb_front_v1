import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatApi } from '../api/chats'
import type { 
  CompleteChatDataResponse, 
  TreeNode, 
  HistoryMessage,
  MessageResponse,
  PaginatedResponse,
  ChatListItem
} from '../types/api'

export const useChatsStore = defineStore('chats', () => {
  // State
  const currentChatUuid = ref<string | null>(null)
  const chatData = ref<CompleteChatDataResponse | null>(null)
  const selectedNodeUuid = ref<string | null>(null)
  const currentPath = ref<TreeNode[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Chat list state
  const recentChats = ref<ChatListItem[]>([])
  const totalChats = ref(0)
  const currentPage = ref(1)
  const totalPages = ref(1)

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
    // Branching mode is active when:
    // 1. A node is selected AND
    // 2. It's not the latest message in the current conversation path
    if (!selectedNode.value || !treeStructure.value) return false
    
    // Find the current conversation path (latest leaf node)
    const latestLeaf = findLatestLeafNode(treeStructure.value)
    const latestLeafUuid = latestLeaf?.uuid
    
    // We're in branching mode if the selected node is not the latest leaf
    return selectedNode.value.uuid !== latestLeafUuid
  })

  const chatTitle = computed((): string => {
    return chatData.value?.title || 'New Chat'
  })

  const systemPrompt = computed((): string | null => {
    return chatData.value?.system_prompt || null
  })

  // Chat management actions
  async function loadCompleteChat(chatUuid: string) {
    isLoading.value = true
    error.value = null
    
    try {
      const data = await chatApi.getCompleteChat(chatUuid)
      chatData.value = data
      currentChatUuid.value = chatUuid
      
      // Reset selection and path, then auto-select latest
      selectedNodeUuid.value = null
      currentPath.value = []
      
      // Auto-select the latest assistant message for easy continuation
      setTimeout(() => autoSelectLatestNode(), 100)
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load chat'
      if (import.meta.env.DEV) {
        console.error('Failed to load chat:', err)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function sendMessage(content: string, modelId?: string | null): Promise<MessageResponse | null> {
    if (!currentChatUuid.value) {
      error.value = 'No chat selected'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      // Determine if we're branching from a selected node
      let parentMessageUuid: string | null = null
      
      if (selectedNodeUuid.value && isBranchingMode.value) {
        // In branching mode, use the selected node as parent
        parentMessageUuid = selectedNodeUuid.value
      }

      const response = await chatApi.sendMessage(
        currentChatUuid.value, 
        content, 
        parentMessageUuid,
        modelId
      )
      
      // Success message for branching only in development
      if (parentMessageUuid && import.meta.env.DEV) {
        console.log('🌿 Branch created successfully! New conversation path started.')
      }
      
      // Reload complete chat data to get updated tree structure
      await loadCompleteChat(currentChatUuid.value)
      
      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to send message'
      if (import.meta.env.DEV) {
        console.error('Failed to send message:', err)
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function createNewChat(initialMessage?: string, modelId?: string): Promise<string | null> {
    isLoading.value = true
    error.value = null

    try {
      const response = await chatApi.createChat(initialMessage, modelId)
      
      // Load the new chat
      await loadCompleteChat(response.chat_uuid)
      
      return response.chat_uuid
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create chat'
      if (import.meta.env.DEV) {
        console.error('Failed to create chat:', err)
      }
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
      if (import.meta.env.DEV) {
        console.error('Failed to update chat:', err)
      }
    }
  }

  async function deleteChat(chatUuid: string) {
    try {
      await chatApi.deleteChat(chatUuid)
      
      // If current chat was deleted, reset state
      if (currentChatUuid.value === chatUuid) {
        reset()
      }
      
      // Refresh chat list
      await fetchRecentChats()
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete chat'
      if (import.meta.env.DEV) {
        console.error('Failed to delete chat:', err)
      }
    }
  }

  // Chat list actions
  async function fetchRecentChats(page = 1, limit = 20) {
    isLoading.value = true
    error.value = null

    try {
      const response = await chatApi.getRecentChats({ page, limit })
      recentChats.value = response.items as ChatListItem[]
      totalChats.value = response.total
      currentPage.value = response.page
      totalPages.value = response.pages
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to fetch chats:', err)
      }
      
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        error.value = 'Cannot connect to backend server. Please ensure it is running on port 8000.'
      } else if (err.response?.status === 404) {
        error.value = 'API endpoint not found. The backend may not be running the correct version.'
      } else if (err.response?.status === 401) {
        error.value = 'Authentication required. Please log in.'
      } else {
        error.value = err.message || 'Failed to fetch chats'
      }
    } finally {
      isLoading.value = false
    }
  }

  async function searchChats(query: string, page = 1, limit = 20) {
    isLoading.value = true
    error.value = null

    try {
      const response = await chatApi.getChats({ q: query, page, limit })
      recentChats.value = response.items as ChatListItem[]
      totalChats.value = response.total
      currentPage.value = response.page
      totalPages.value = response.pages
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to search chats'
      if (import.meta.env.DEV) {
        console.error('Failed to search chats:', err)
      }
    } finally {
      isLoading.value = false
    }
  }

  // Navigation functions
  function selectNode(nodeUuid: string) {
    selectedNodeUuid.value = nodeUuid
    currentPath.value = getPathToNode(nodeUuid)
    if (import.meta.env.DEV) {
      console.log('Node selected for branching:', nodeUuid)
    }
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

  // Find the latest leaf node (for determining if we're in branching mode)
  function findLatestLeafNode(node: TreeNode): TreeNode | null {
    if (node.children.length === 0) {
      return node
    }
    
    // Find the leaf with the latest timestamp (approximate by traversing deepest path)
    let deepestLeaf: TreeNode | null = null
    let maxDepth = -1
    
    function traverse(currentNode: TreeNode, depth: number) {
      if (currentNode.children.length === 0) {
        if (depth > maxDepth) {
          maxDepth = depth
          deepestLeaf = currentNode
        }
      } else {
        for (const child of currentNode.children) {
          traverse(child, depth + 1)
        }
      }
    }
    
    traverse(node, 0)
    return deepestLeaf
  }

  // Auto-select the latest node when loading a chat
  function autoSelectLatestNode() {
    if (!treeStructure.value) return
    
    const latestLeaf = findLatestLeafNode(treeStructure.value)
    if (latestLeaf && latestLeaf.role === 'assistant') {
      // Auto-select the latest assistant message for easy continuation
      selectNode(latestLeaf.uuid)
    }
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
    recentChats,
    totalChats,
    currentPage,
    totalPages,

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
    deleteChat,
    fetchRecentChats,
    searchChats,
    selectNode,
    clearSelection,
    reset,

    // Tree utilities
    findNodeInTree,
    getPathToNode,
    isLeafNode,
    getNodeChildren,
    getNodeParent,
    findLatestLeafNode,
    autoSelectLatestNode
  }
})

// For backward compatibility, also export as useChatStore
export const useChatStore = useChatsStore