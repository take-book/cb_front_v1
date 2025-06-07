import { ref, onUnmounted } from 'vue'
import apiClient from '../api/client'

export interface SSEMessage {
  type: 'chunk' | 'final' | 'error' | 'done'
  data: any
}

export interface StreamMessageRequest {
  content: string
  parent_message_uuid?: string
  model_id?: string
}

export function useServerSentEvents() {
  const eventSource = ref<EventSource | null>(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const error = ref<string | null>(null)

  const createStreamRequest = async (
    chatUuid: string, 
    request: StreamMessageRequest
  ): Promise<EventSource> => {
    // Get auth token for SSE connection
    const accessToken = localStorage.getItem('access_token')
    if (!accessToken) {
      throw new Error('Authentication required')
    }

    // First, send the POST request to initiate streaming
    const response = await apiClient.post(
      `/api/v1/chats/${chatUuid}/messages/stream`,
      request,
      {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        responseType: 'stream'
      }
    )

    // Create EventSource with auth header
    const baseUrl = apiClient.defaults.baseURL || ''
    const url = new URL(`/api/v1/chats/${chatUuid}/messages/stream`, baseUrl)
    
    // EventSource doesn't support custom headers directly,
    // so we need to include the token in the URL as a query parameter
    // or use a different approach
    url.searchParams.set('access_token', accessToken)

    const eventSource = new EventSource(url.toString())
    return eventSource
  }

  const connect = async (
    chatUuid: string,
    request: StreamMessageRequest
  ): Promise<void> => {
    // For SSE, we don't need to pre-establish connection
    // The connection will be created when sendStreamMessage is called
    return Promise.resolve()
  }

  const disconnect = () => {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
    isConnected.value = false
    isConnecting.value = false
    error.value = null
  }

  const sendStreamMessage = async (
    chatUuid: string,
    request: StreamMessageRequest
  ): Promise<void> => {
    try {
      isConnecting.value = true
      error.value = null

      // Send the message and set up SSE connection
      const response = await fetch(`${apiClient.defaults.baseURL}/api/v1/chats/${chatUuid}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      isConnected.value = true
      isConnecting.value = false

      // Set up SSE event parsing
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      const processStream = async () => {
        let buffer = ''
        let currentEvent = 'chunk' // Default event type
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            // Accumulate chunks in buffer to handle partial lines
            buffer += decoder.decode(value, { stream: true })
            
            // Process complete lines only
            const lines = buffer.split('\n')
            // Keep the last incomplete line in buffer
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmedLine = line.trim()
              
              if (trimmedLine.startsWith('event: ')) {
                // Update current event type
                currentEvent = trimmedLine.slice(7).trim()
                continue
              }
              
              if (trimmedLine.startsWith('data: ')) {
                const data = trimmedLine.slice(6).trim()
                
                if (data === '[DONE]') {
                  // Handle completion
                  if (currentMessageHandler) {
                    currentMessageHandler({ type: 'done', data: null })
                  }
                  disconnect()
                  return
                }

                if (data) { // Skip empty data lines
                  try {
                    const parsedData = JSON.parse(data)
                    
                    // Determine event type based on data structure or current event
                    let eventType: 'chunk' | 'final' | 'error' = 'chunk'
                    
                    if (parsedData.event) {
                      eventType = parsedData.event as 'chunk' | 'final' | 'error'
                    } else if (currentEvent === 'final' || currentEvent === 'error') {
                      eventType = currentEvent as 'chunk' | 'final' | 'error'
                    } else if (parsedData.type) {
                      eventType = parsedData.type as 'chunk' | 'final' | 'error'
                    }
                    
                    // Send the message to handler
                    if (currentMessageHandler) {
                      currentMessageHandler({ 
                        type: eventType, 
                        data: parsedData.data || parsedData 
                      })
                    }
                    
                    // Reset event type to default after processing
                    currentEvent = 'chunk'
                    
                  } catch (parseError) {
                    console.warn('Failed to parse SSE data:', data, parseError)
                    // Don't throw, just continue processing
                  }
                }
              }
              // Handle empty lines (which separate messages in SSE)
              else if (trimmedLine === '') {
                // Reset event type on empty line
                currentEvent = 'chunk'
              }
            }
          }
          
          // Process any remaining data in buffer
          if (buffer.trim()) {
            console.warn('Stream ended with incomplete data:', buffer)
          }
          
        } catch (streamError) {
          console.error('Stream processing error:', streamError)
          if (currentMessageHandler) {
            currentMessageHandler({ 
              type: 'error', 
              data: { message: streamError instanceof Error ? streamError.message : 'Stream processing failed' }
            })
          }
        } finally {
          disconnect()
        }
      }

      processStream()

    } catch (err) {
      isConnecting.value = false
      isConnected.value = false
      error.value = err instanceof Error ? err.message : 'Failed to send stream message'
      console.error('SSE send error:', err)
      
      // Notify error handler if available
      if (currentMessageHandler) {
        currentMessageHandler({
          type: 'error',
          data: { message: error.value }
        })
      }
      
      throw err
    }
  }

  // Store the current message handler
  let currentMessageHandler: ((message: SSEMessage) => void) | null = null

  const onMessage = (callback: (message: SSEMessage) => void) => {
    // Store the callback for use in sendStreamMessage
    currentMessageHandler = callback
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    eventSource,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    sendStreamMessage,
    onMessage
  }
}