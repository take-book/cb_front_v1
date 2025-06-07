import type { StreamingMessage } from '../composables/useStreamingMessage'
import type { HistoryMessage } from '../types/api'

/**
 * Merges existing messages and streaming messages while avoiding duplication
 * 
 * Logic:
 * 1. For user messages: check if streaming message content/ID already exists in existing messages
 * 2. If duplicate found: exclude from streaming display (show only existing)
 * 3. If not duplicate: include in streaming display
 * 4. For assistant messages: always show both (existing and streaming are different)
 */
export function mergeMessagesWithoutDuplication(
  existingMessages: HistoryMessage[],
  streamingMessages: Map<string, StreamingMessage>
): { 
  displayMessages: HistoryMessage[], 
  streamingOnlyMessages: StreamingMessage[] 
} {
  const allStreamingMessages = Array.from(streamingMessages.values())
  
  // Create sets for efficient lookup
  const existingUserIds = new Set(
    existingMessages
      .filter(m => m.role === 'user')
      .map(m => m.message_uuid)
  )
  
  const existingUserContents = new Set(
    existingMessages
      .filter(m => m.role === 'user')
      .map(m => m.content.trim())
  )
  
  // Filter streaming messages to avoid user message duplication
  const streamingOnlyMessages = allStreamingMessages.filter(streamingMsg => {
    if (streamingMsg.role === 'user') {
      // Check for ID-based duplication
      if (existingUserIds.has(streamingMsg.id)) {
        return false
      }
      
      // Check for content-based duplication
      if (existingUserContents.has(streamingMsg.content.trim())) {
        return false
      }
    }
    
    // Always include assistant messages and non-duplicate user messages
    return true
  })
  
  return {
    displayMessages: existingMessages,
    streamingOnlyMessages
  }
}

/**
 * Helper function to check if a user message is duplicated
 */
export function isUserMessageDuplicated(
  userMessage: StreamingMessage,
  existingMessages: HistoryMessage[]
): boolean {
  if (userMessage.role !== 'user') {
    return false
  }
  
  const existingUserMessages = existingMessages.filter(m => m.role === 'user')
  
  // Check ID-based duplication
  const hasIdDuplicate = existingUserMessages.some(
    existing => existing.message_uuid === userMessage.id
  )
  
  // Check content-based duplication
  const hasContentDuplicate = existingUserMessages.some(
    existing => existing.content.trim() === userMessage.content.trim()
  )
  
  return hasIdDuplicate || hasContentDuplicate
}

/**
 * Get all unique user messages from both sources
 */
export function getAllUniqueMessages(
  existingMessages: HistoryMessage[],
  streamingMessages: Map<string, StreamingMessage>
): Array<HistoryMessage | StreamingMessage> {
  const { displayMessages, streamingOnlyMessages } = mergeMessagesWithoutDuplication(
    existingMessages,
    streamingMessages
  )
  
  // Combine and sort by timestamp if available
  const allMessages: Array<HistoryMessage | StreamingMessage> = [
    ...displayMessages,
    ...streamingOnlyMessages
  ]
  
  // Sort by timestamp (streaming messages have timestamps, existing messages don't)
  // For simplicity, we'll keep existing order for existing messages and append streaming
  return allMessages
}