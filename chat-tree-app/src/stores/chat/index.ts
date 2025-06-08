import { computed } from 'vue'
import { useChatListStore } from './chatData'
import { useChatNavigationStore } from './chatNavigation'
import type { HistoryMessage } from '../../types/api'

// Chat detail store that combines list data and navigation stores
export const useChatDetailStore = () => {
  const listStore = useChatListStore()
  const navigationStore = useChatNavigationStore()

  // Computed properties that depend on both stores
  const selectedNode = computed(() => {
    return navigationStore.getSelectedNode(listStore.treeStructure)
  })

  const isBranchingMode = computed(() => {
    return navigationStore.getIsBranchingMode(listStore.treeStructure)
  })

  // Enhanced navigation functions that work with current tree
  const selectNode = (nodeUuid: string) => {
    navigationStore.selectNode(nodeUuid, listStore.treeStructure)
  }

  const autoSelectLatestNode = () => {
    // Try to restore preserved selection first, otherwise auto-select latest
    setTimeout(() => {
      const wasRestored = navigationStore.restorePreservedSelection(listStore.treeStructure, true)
      if (!wasRestored) {
        navigationStore.autoSelectLatestNode(listStore.treeStructure)
      }
    }, 100)
  }

  // Enhanced sendMessage that handles navigation
  const sendMessage = async (content: string, modelId?: string | null) => {
    let parentMessageUuid: string | null = null
    
    if (navigationStore.selectedNodeUuid && isBranchingMode.value) {
      // In branching mode, use the selected node as parent
      parentMessageUuid = navigationStore.selectedNodeUuid
    }

    const response = await listStore.sendMessage(content, modelId, parentMessageUuid)
    
    // Note: autoSelectLatestNode is handled by loadCompleteChat which is called by sendMessage
    
    return response
  }

  // Enhanced loadCompleteChat that handles navigation
  const loadCompleteChat = async (chatUuid: string) => {
    await listStore.loadCompleteChat(chatUuid)
    
    // Reset selection and path
    navigationStore.clearSelection()
    
    // Auto-select latest node
    autoSelectLatestNode()
  }

  // System message filtering
  const getFilteredMessages = (): HistoryMessage[] => {
    if (navigationStore.showSystemMessages) {
      return listStore.messages
    }
    return listStore.messages.filter(msg => msg.role !== 'system')
  }

  // Preserve selection for streaming
  const preserveSelectionForStreaming = () => {
    navigationStore.preserveSelectionForStreaming(listStore.treeStructure)
  }

  const restorePreservedSelection = (preferNewBranch: boolean = false) => {
    return navigationStore.restorePreservedSelection(listStore.treeStructure, preferNewBranch)
  }

  // Tree utilities with current tree context
  const isLeafNode = (nodeUuid: string) => {
    return navigationStore.isLeafNode(nodeUuid, listStore.treeStructure)
  }

  const getNodeChildren = (nodeUuid: string) => {
    return navigationStore.getNodeChildren(nodeUuid, listStore.treeStructure)
  }

  const getNodeParent = (nodeUuid: string) => {
    return navigationStore.getNodeParent(nodeUuid, listStore.treeStructure)
  }

  const findLatestLeafNode = () => {
    return listStore.treeStructure ? navigationStore.findLatestLeafNode(listStore.treeStructure) : null
  }

  const shouldShowNodeInTree = (nodeUuid: string) => {
    return navigationStore.shouldShowNodeInTree(nodeUuid, listStore.treeStructure)
  }

  // Reset both stores
  const reset = () => {
    listStore.reset()
    navigationStore.clearSelection()
  }

  return {
    // State from list store
    currentChatUuid: listStore.currentChatUuid,
    chatData: listStore.chatData,
    isLoading: listStore.isLoading,
    error: listStore.error,
    recentChats: listStore.recentChats,
    totalChats: listStore.totalChats,
    currentPage: listStore.currentPage,
    totalPages: listStore.totalPages,
    treeStructure: listStore.treeStructure,
    messages: listStore.messages,
    chatTitle: listStore.chatTitle,
    systemPrompt: listStore.systemPrompt,
    
    // State from navigation store
    selectedNodeUuid: navigationStore.selectedNodeUuid,
    currentPath: navigationStore.currentPath,
    showSystemMessages: navigationStore.showSystemMessages,

    // Computed
    selectedNode,
    isBranchingMode,

    // Enhanced actions
    loadCompleteChat,
    sendMessage,
    selectNode,
    autoSelectLatestNode,
    reset,
    
    // Navigation actions
    clearSelection: navigationStore.clearSelection,
    toggleSystemMessages: navigationStore.toggleSystemMessages,
    
    // Branch selection preservation
    preserveSelectionForStreaming,
    getPreservedSelection: navigationStore.getPreservedSelection,
    restorePreservedSelection,
    clearPreservedSelection: navigationStore.clearPreservedSelection,

    // Tree utilities
    isLeafNode,
    getNodeChildren,
    getNodeParent,
    findLatestLeafNode,
    shouldShowNodeInTree,
    
    // System message filtering
    getFilteredMessages,
    
    // Pass through list store actions
    createNewChat: listStore.createNewChat,
    updateChatMetadata: listStore.updateChatMetadata,
    deleteChat: listStore.deleteChat,
    fetchRecentChats: listStore.fetchRecentChats,
    searchChats: listStore.searchChats
  }
}

