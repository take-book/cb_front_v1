import { ref, computed, onUnmounted } from 'vue'
import { useServerSentEvents } from './useServerSentEvents'
import type { SSEMessage, StreamMessageRequest } from './useServerSentEvents'

export interface StreamingMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  isComplete: boolean
  timestamp: number
}

export function useStreamingMessage() {
  const { connect, disconnect, sendStreamMessage, onMessage, isConnected, error } = useServerSentEvents()
  
  const streamingMessages = ref<Map<string, StreamingMessage>>(new Map())
  const isStreaming = ref(false)
  const currentStreamId = ref<string | null>(null)
  const currentAssistantStreamId = ref<string | null>(null) // Track current assistant message

  // Get the current streaming message
  const currentStreamingMessage = computed(() => {
    if (!currentStreamId.value) return null
    return streamingMessages.value.get(currentStreamId.value) || null
  })

  const initializeSSE = async (chatUuid: string, request: StreamMessageRequest) => {
    try {
      await connect(chatUuid, request)
      setupMessageHandlers()
    } catch (err) {
      console.error('Failed to connect to SSE:', err)
      throw err
    }
  }

  const setupMessageHandlers = () => {
    onMessage((message: SSEMessage) => {
      switch (message.type) {
        case 'chunk':
          handleMessageChunk(message.data)
          break
        case 'final':
          handleMessageComplete(message.data)
          break
        case 'error':
          handleError(message.data)
          break
        case 'done':
          handleStreamComplete()
          break
      }
    })
  }

  const handleMessageChunk = (data: any) => {
    // SSE chunk data format may vary - adjust based on actual backend response
    let messageId = data.message_uuid || data.message_id
    const contentChunk = data.content || data.chunk || data.text || ''
    const role = data.role || 'assistant'
    
    // If no message ID provided, use or create a consistent one for this session
    if (!messageId) {
      if (!currentAssistantStreamId.value) {
        currentAssistantStreamId.value = `assistant-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
      messageId = currentAssistantStreamId.value
    } else {
      // If we get a new message ID, update the current assistant stream ID
      if (role === 'assistant') {
        currentAssistantStreamId.value = messageId
      }
    }
    
    if (!streamingMessages.value.has(messageId)) {
      // Create new streaming message
      const newMessage: StreamingMessage = {
        id: messageId,
        role: role,
        content: contentChunk,
        isComplete: false,
        timestamp: Date.now()
      }
      const newMap = new Map(streamingMessages.value)
      newMap.set(messageId, newMessage)
      streamingMessages.value = newMap
      currentStreamId.value = messageId
    } else {
      // Update existing message with accumulated content
      const existing = streamingMessages.value.get(messageId)!
      const updatedMessage: StreamingMessage = {
        ...existing,
        content: existing.content + contentChunk
      }
      const newMap = new Map(streamingMessages.value)
      newMap.set(messageId, updatedMessage)
      streamingMessages.value = newMap
    }
  }

  const handleMessageComplete = (data: any) => {
    const messageId = data.message_uuid || data.message_id || currentAssistantStreamId.value || currentStreamId.value
    const finalContent = data.content || data.final_content || data.text
    
    if (messageId && streamingMessages.value.has(messageId)) {
      const existing = streamingMessages.value.get(messageId)!
      const updatedMessage: StreamingMessage = {
        ...existing,
        content: finalContent || existing.content,
        isComplete: true
      }
      const newMap = new Map(streamingMessages.value)
      newMap.set(messageId, updatedMessage)
      streamingMessages.value = newMap
    }
    
    isStreaming.value = false
    currentStreamId.value = null
  }

  const handleStreamComplete = () => {
    // Handle [DONE] event
    isStreaming.value = false
    
    // Mark current assistant message as complete
    const messageId = currentAssistantStreamId.value || currentStreamId.value
    if (messageId && streamingMessages.value.has(messageId)) {
      const existing = streamingMessages.value.get(messageId)!
      const updatedMessage: StreamingMessage = {
        ...existing,
        isComplete: true
      }
      const newMap = new Map(streamingMessages.value)
      newMap.set(messageId, updatedMessage)
      streamingMessages.value = newMap
    }
    
    currentStreamId.value = null
    currentAssistantStreamId.value = null
    
    // Emit completion event for UI updates (optional)
    console.log('SSE streaming completed successfully')
  }

  const handleError = (data: any) => {
    console.error('Streaming error:', data)
    isStreaming.value = false
    currentStreamId.value = null
  }

  const sendStreamingMessage = async (chatUuid: string, content: string, parentMessageUuid?: string, modelId?: string) => {
    // Reset streaming state for new message
    isStreaming.value = true
    currentStreamId.value = null
    currentAssistantStreamId.value = null
    
    const request: StreamMessageRequest = {
      content,
      parent_message_uuid: parentMessageUuid,
      model_id: modelId
    }

    try {
      // STEP 1: Immediately display user message
      const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const userMessage: StreamingMessage = {
        id: userMessageId,
        role: 'user',
        content: content,
        isComplete: true, // User messages are immediately complete
        timestamp: Date.now()
      }
      
      const newMap = new Map(streamingMessages.value)
      newMap.set(userMessageId, userMessage)
      streamingMessages.value = newMap
      
      // STEP 2: Initialize SSE connection and setup handlers
      await initializeSSE(chatUuid, request)
      
      // STEP 3: Send the actual message to start streaming
      await sendStreamMessage(chatUuid, request)
      
    } catch (err) {
      isStreaming.value = false
      currentStreamId.value = null
      currentAssistantStreamId.value = null
      throw err
    }
  }

  const clearStreamingMessage = (messageId: string) => {
    streamingMessages.value.delete(messageId)
    if (currentStreamId.value === messageId) {
      currentStreamId.value = null
      isStreaming.value = false
    }
  }

  const clearAllStreamingMessages = () => {
    streamingMessages.value.clear()
    currentStreamId.value = null
    isStreaming.value = false
  }

  // Cleanup on component unmount to prevent memory leaks
  onUnmounted(() => {
    clearAllStreamingMessages()
    disconnect()
  })

  return {
    streamingMessages,
    currentStreamingMessage,
    isStreaming,
    currentStreamId,
    isConnected,
    error,
    initializeSSE,
    sendStreamingMessage,
    clearStreamingMessage,
    clearAllStreamingMessages,
    disconnect
  }
}