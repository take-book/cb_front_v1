import { ref, computed, watchEffect } from 'vue'
import { useStreamingMessage } from './useStreamingMessage'
import { useChatsStore } from '../stores/chats'
import { useStoreErrorHandler } from './useStoreErrorHandler'

export function useChatStreaming() {
  const chatsStore = useChatsStore()
  const { 
    currentStreamingMessage, 
    isStreaming, 
    sendStreamingMessage, 
    initializeSSE,
    clearStreamingMessage,
    streamingMessages
  } = useStreamingMessage()

  const { handleAsyncOperation, error, clearError } = useStoreErrorHandler()

  const useStreaming = ref(true)
  const lastProcessedChatUuid = ref<string | null>(null)

  // Watch for streaming completion and auto-reload chat data
  watchEffect(() => {
    if (!isStreaming.value && lastProcessedChatUuid.value) {
      // Check if we have any completed assistant messages that aren't in the store yet
      const assistantMessages = Array.from(streamingMessages.value.values())
        .filter(msg => msg.role === 'assistant' && msg.isComplete)
      
      if (assistantMessages.length > 0) {
        // Reload chat data after a short delay to ensure backend has processed the message
        setTimeout(() => {
          if (lastProcessedChatUuid.value) {
            chatsStore.loadCompleteChat(lastProcessedChatUuid.value)
            // Clear streaming messages after reload
            assistantMessages.forEach(msg => clearStreamingMessage(msg.id))
            lastProcessedChatUuid.value = null
          }
        }, 1000)
      }
    }
  })

  const handleStreamingMessage = async (
    chatUuid: string,
    message: string,
    selectedNodeUuid?: string,
    selectedModelId?: string
  ) => {
    if (!message.trim() || !chatUuid) {
      throw new Error('Message and chat UUID are required')
    }

    return await handleAsyncOperation(
      async () => {
        // Preserve selection before streaming (for branch mode restoration)
        chatsStore.preserveSelectionForStreaming()
        
        // Track which chat we're processing for auto-reload
        lastProcessedChatUuid.value = chatUuid
        
        // Use SSE streaming
        await sendStreamingMessage(
          chatUuid,
          message.trim(),
          selectedNodeUuid,
          selectedModelId
        )
        
        return true
      },
      'sendStreamingMessage',
      { showToast: true, logError: true }
    )
  }

  const handleTraditionalMessage = async (
    chatUuid: string,
    message: string,
    selectedModelId?: string
  ) => {
    if (!message.trim()) {
      throw new Error('Message is required')
    }

    return await handleAsyncOperation(
      async () => {
        const response = await chatsStore.sendMessage(message.trim(), selectedModelId)
        
        if (response) {
          // Show appropriate feedback based on mode
          if (!chatsStore.isBranchingMode) {
            chatsStore.clearSelection()
          }
          return response
        }
        
        return null
      },
      'sendTraditionalMessage',
      { showToast: true, logError: true }
    )
  }

  const sendMessage = async (
    chatUuid: string,
    message: string,
    selectedNodeUuid?: string,
    selectedModelId?: string
  ) => {
    if (!message.trim() || !chatUuid) {
      throw new Error('Message and chat UUID are required')
    }

    clearError() // Clear any previous errors
    
    if (useStreaming.value) {
      return await handleStreamingMessage(chatUuid, message, selectedNodeUuid, selectedModelId)
    } else {
      return await handleTraditionalMessage(chatUuid, message, selectedModelId)
    }
  }

  return {
    // State
    useStreaming,
    currentStreamingMessage,
    isStreaming,
    streamingMessages,
    error,
    
    // Actions
    sendMessage,
    handleStreamingMessage,
    handleTraditionalMessage,
    clearError,
    
    // Utils
    initializeSSE,
    clearStreamingMessage
  }
}