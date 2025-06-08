import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useChatsStore } from '../stores/chats'
import { useChatListStore } from '../stores/chat/chatData'
import { useChatNavigationStore } from '../stores/chat/chatNavigation'
import { getBranchConversationThread } from '../utils/treeHelpers'
import type { HistoryMessage, ModelDto } from '../types/api'

export function useChatCoordination() {
  const route = useRoute()
  const router = useRouter()
  const chatsStore = useChatsStore()
  
  // Get individual stores for storeToRefs
  const dataStore = useChatListStore()
  const navigationStore = useChatNavigationStore()
  
  // Extract reactive refs from individual stores
  const {
    isLoading,
    error,
    chatTitle,
    messages,
    treeStructure
  } = storeToRefs(dataStore)
  
  const {
    selectedNodeUuid,
    currentPath,
    showSystemMessages
  } = storeToRefs(navigationStore)

  // Get computed properties from unified store
  const { selectedNode, isBranchingMode } = chatsStore

  // Local state
  const selectedModelId = ref<string | null>(null)

  // Route-based computed properties
  const chatUuid = computed(() => route.params.chatUuid as string)

  // Watch for route changes and load chat data
  watch(chatUuid, async (newChatUuid) => {
    if (newChatUuid) {
      await chatsStore.loadCompleteChat(newChatUuid)
    }
  }, { immediate: true })

  // Get conversation messages for the current thread
  const conversationMessages = computed((): HistoryMessage[] => {
    return getBranchConversationThread(
      treeStructure.value,
      messages.value,
      selectedNodeUuid.value
    )
  })

  // Get filtered conversation messages based on system message visibility
  const filteredConversationMessages = computed((): HistoryMessage[] => {
    const msgs = conversationMessages.value
    if (showSystemMessages.value) {
      return msgs
    }
    return msgs.filter(msg => msg.role !== 'system')
  })

  // Get selected message details (keeping for compatibility)
  const selectedMessage = computed((): HistoryMessage | null => {
    if (!selectedNodeUuid.value || !selectedNode.value) {
      return null
    }
    
    // Convert TreeNode to HistoryMessage format
    const node = selectedNode.value
    return {
      message_uuid: node.uuid,
      role: node.role,
      content: node.content
    }
  })

  // Event handlers
  const handleNodeClick = (nodeUuid: string) => {
    chatsStore.selectNode(nodeUuid)
  }

  const handleMessageSelect = (messageUuid: string) => {
    chatsStore.selectNode(messageUuid)
  }

  const handleModelSelected = (model: ModelDto | null) => {
    if (model) {
      selectedModelId.value = model.id
    }
  }

  const handleClearSelection = () => {
    chatsStore.clearSelection()
  }

  const handleToggleSystemMessages = () => {
    chatsStore.toggleSystemMessages()
  }

  // Navigation helpers
  const navigateToChat = (chatUuid: string) => {
    router.push(`/chat/${chatUuid}`)
  }

  const navigateBack = () => {
    router.back()
  }

  // Utility functions
  const truncateContent = (content: string, maxLength: number = 150): string => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return {
    // Route data
    chatUuid,
    
    // State
    selectedModelId,
    
    // Computed data
    conversationMessages,
    filteredConversationMessages,
    selectedMessage,
    
    // Store getters (direct refs from storeToRefs)
    isLoading,
    error,
    chatTitle,
    messages,
    treeStructure,
    selectedNodeUuid,
    currentPath,
    showSystemMessages,
    isBranchingMode,
    selectedNode,
    
    // Event handlers
    handleNodeClick,
    handleMessageSelect,
    handleModelSelected,
    handleClearSelection,
    handleToggleSystemMessages,
    
    // Navigation
    navigateToChat,
    navigateBack,
    
    // Utilities
    truncateContent
  }
}