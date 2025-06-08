import { computed } from 'vue'
import { useChatDataStore } from './chatData'
import { useChatNavigationStore } from './chatNavigation'
import type { HistoryMessage } from '../../types/api'

// Unified chat store that combines data and navigation stores
export const useChatsStore = () => {
  const dataStore = useChatDataStore()
  const navigationStore = useChatNavigationStore()

  // Computed properties that depend on both stores
  const selectedNode = computed(() => {
    return navigationStore.getSelectedNode(dataStore.treeStructure)
  })

  const isBranchingMode = computed(() => {
    return navigationStore.getIsBranchingMode(dataStore.treeStructure)
  })

  // Enhanced navigation functions that work with current tree
  const selectNode = (nodeUuid: string) => {
    navigationStore.selectNode(nodeUuid, dataStore.treeStructure)
  }

  const autoSelectLatestNode = () => {
    // Try to restore preserved selection first, otherwise auto-select latest
    setTimeout(() => {
      const wasRestored = navigationStore.restorePreservedSelection(dataStore.treeStructure, true)
      if (!wasRestored) {
        navigationStore.autoSelectLatestNode(dataStore.treeStructure)
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

    const response = await dataStore.sendMessage(content, modelId, parentMessageUuid)
    
    // Auto-select after successful send
    if (response) {
      autoSelectLatestNode()
    }
    
    return response
  }

  // Enhanced loadCompleteChat that handles navigation
  const loadCompleteChat = async (chatUuid: string) => {
    await dataStore.loadCompleteChat(chatUuid)
    
    // Reset selection and path
    navigationStore.clearSelection()
    
    // Auto-select latest node
    autoSelectLatestNode()
  }

  // System message filtering
  const getFilteredMessages = (): HistoryMessage[] => {
    if (navigationStore.showSystemMessages) {
      return dataStore.messages
    }
    return dataStore.messages.filter(msg => msg.role !== 'system')
  }

  // Preserve selection for streaming
  const preserveSelectionForStreaming = () => {
    navigationStore.preserveSelectionForStreaming(dataStore.treeStructure)
  }

  const restorePreservedSelection = (preferNewBranch: boolean = false) => {
    return navigationStore.restorePreservedSelection(dataStore.treeStructure, preferNewBranch)
  }

  // Tree utilities with current tree context
  const isLeafNode = (nodeUuid: string) => {
    return navigationStore.isLeafNode(nodeUuid, dataStore.treeStructure)
  }

  const getNodeChildren = (nodeUuid: string) => {
    return navigationStore.getNodeChildren(nodeUuid, dataStore.treeStructure)
  }

  const getNodeParent = (nodeUuid: string) => {
    return navigationStore.getNodeParent(nodeUuid, dataStore.treeStructure)
  }

  const findLatestLeafNode = () => {
    return dataStore.treeStructure ? navigationStore.findLatestLeafNode(dataStore.treeStructure) : null
  }

  const shouldShowNodeInTree = (nodeUuid: string) => {
    return navigationStore.shouldShowNodeInTree(nodeUuid, dataStore.treeStructure)
  }

  // Reset both stores
  const reset = () => {
    dataStore.reset()
    navigationStore.clearSelection()
  }

  return {
    // State from both stores
    ...dataStore,
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
    
    // Pass through data store actions
    createNewChat: dataStore.createNewChat,
    updateChatMetadata: dataStore.updateChatMetadata,
    deleteChat: dataStore.deleteChat,
    fetchRecentChats: dataStore.fetchRecentChats,
    searchChats: dataStore.searchChats
  }
}

// For backward compatibility
export { useChatsStore as useChatStore }