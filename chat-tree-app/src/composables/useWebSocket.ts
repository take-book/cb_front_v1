import { ref, onUnmounted } from 'vue'

export interface WebSocketMessage {
  type: 'message_chunk' | 'message_complete' | 'error'
  data: any
}

export function useWebSocket() {
  const socket = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const error = ref<string | null>(null)

  const connect = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (socket.value?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      isConnecting.value = true
      error.value = null

      try {
        socket.value = new WebSocket(url)

        socket.value.onopen = () => {
          isConnected.value = true
          isConnecting.value = false
          console.log('WebSocket connected')
          resolve()
        }

        socket.value.onclose = () => {
          isConnected.value = false
          isConnecting.value = false
          console.log('WebSocket disconnected')
        }

        socket.value.onerror = (event) => {
          error.value = 'WebSocket connection failed'
          isConnecting.value = false
          console.error('WebSocket error:', event)
          reject(new Error('WebSocket connection failed'))
        }
      } catch (err) {
        isConnecting.value = false
        error.value = 'Failed to create WebSocket connection'
        reject(err)
      }
    })
  }

  const disconnect = () => {
    if (socket.value) {
      // Remove all event listeners to prevent memory leaks
      socket.value.onopen = null
      socket.value.onclose = null
      socket.value.onerror = null
      socket.value.onmessage = null
      
      // Close the connection
      if (socket.value.readyState === WebSocket.OPEN || socket.value.readyState === WebSocket.CONNECTING) {
        socket.value.close()
      }
      
      socket.value = null
    }
    isConnected.value = false
    isConnecting.value = false
    error.value = null
  }

  const send = (message: any) => {
    if (socket.value?.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify(message))
    } else {
      throw new Error('WebSocket is not connected')
    }
  }

  const onMessage = (callback: (message: WebSocketMessage) => void) => {
    if (socket.value) {
      socket.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          callback(message)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }
    }
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    send,
    onMessage
  }
}