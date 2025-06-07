import { ref, computed, onUnmounted } from 'vue'
import { useWebSocket } from './useWebSocket'
import type { WebSocketMessage } from './useWebSocket'

export interface StreamingMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  isComplete: boolean
  timestamp: number
}

export function useStreamingMessage() {
  const { connect, disconnect, send, onMessage, isConnected, error } = useWebSocket()
  
  const streamingMessages = ref<Map<string, StreamingMessage>>(new Map())
  const isStreaming = ref(false)
  const currentStreamId = ref<string | null>(null)

  // Get the current streaming message
  const currentStreamingMessage = computed(() => {
    if (!currentStreamId.value) return null
    return streamingMessages.value.get(currentStreamId.value) || null
  })

  const initializeWebSocket = async () => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
    try {
      await connect(wsUrl)
      setupMessageHandlers()
    } catch (err) {
      console.error('Failed to connect to WebSocket:', err)
      throw err
    }
  }

  const setupMessageHandlers = () => {
    onMessage((message: WebSocketMessage) => {
      switch (message.type) {
        case 'message_chunk':
          handleMessageChunk(message.data)
          break
        case 'message_complete':
          handleMessageComplete(message.data)
          break
        case 'error':
          handleError(message.data)
          break
      }
    })
  }

  const handleMessageChunk = (data: any) => {
    const { message_id, content_chunk, role } = data
    
    if (!streamingMessages.value.has(message_id)) {
      // Create new streaming message
      streamingMessages.value.set(message_id, {
        id: message_id,
        role: role || 'assistant',
        content: content_chunk,
        isComplete: false,
        timestamp: Date.now()
      })
      currentStreamId.value = message_id
    } else {
      // Append to existing message
      const existing = streamingMessages.value.get(message_id)!
      existing.content += content_chunk
      streamingMessages.value.set(message_id, { ...existing })
    }
  }

  const handleMessageComplete = (data: any) => {
    const { message_id, final_content } = data
    
    if (streamingMessages.value.has(message_id)) {
      const existing = streamingMessages.value.get(message_id)!
      existing.content = final_content || existing.content
      existing.isComplete = true
      streamingMessages.value.set(message_id, { ...existing })
    }
    
    isStreaming.value = false
    currentStreamId.value = null
  }

  const handleError = (data: any) => {
    console.error('Streaming error:', data)
    isStreaming.value = false
    currentStreamId.value = null
  }

  const sendStreamingMessage = async (chatUuid: string, content: string, parentMessageUuid?: string, modelId?: string) => {
    if (!isConnected.value) {
      await initializeWebSocket()
    }

    isStreaming.value = true
    
    const message = {
      type: 'send_message',
      data: {
        chat_uuid: chatUuid,
        content,
        parent_message_uuid: parentMessageUuid,
        model_id: modelId,
        stream: true
      }
    }

    send(message)
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
    initializeWebSocket,
    sendStreamingMessage,
    clearStreamingMessage,
    clearAllStreamingMessages,
    disconnect
  }
}