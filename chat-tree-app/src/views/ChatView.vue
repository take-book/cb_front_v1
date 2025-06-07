<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Header Controls -->
    <ChatControls 
      :show-system-messages="chatsStore.showSystemMessages"
      :message-count="chatsStore.messages.length"
      :chat-title="chatsStore.chatTitle"
      :show-model-selector="true"
      :selected-model-id="selectedModelId"
      @toggle-system-messages="chatsStore.toggleSystemMessages"
      @model-selected="handleModelSelected"
    />

    <!-- Main Chat Panel Layout -->
    <ChatPanelLayout
      :is-loading="chatsStore.isLoading"
      :error="chatsStore.error"
      :tree-structure="chatsStore.treeStructure"
      :messages="chatsStore.messages"
      :selected-node-uuid="chatsStore.selectedNodeUuid"
      :current-path="chatsStore.currentPath"
      :show-system-messages="chatsStore.showSystemMessages"
      :is-branching-mode="chatsStore.isBranchingMode"
      :filtered-conversation-messages="filteredConversationMessages"
      :streaming-message="currentStreamingMessage"
      :streaming-messages="streamingMessages"
      @node-click="handleNodeClick"
      @select-message="handleMessageSelect"
      @clear-selection="chatsStore.clearSelection"
    >
      <template #input>
        <!-- Compact Message Input -->
        <div class="p-4 bg-gray-50 border-t border-gray-200">
          <form @submit.prevent="handleSendMessage" data-test="message-form">
            <div class="flex space-x-2">
              <div class="flex-1">
                <textarea
                  id="message"
                  v-model="newMessage"
                  data-test="message-input"
                  placeholder="Type your message here..."
                  rows="3"
                  class="w-full resize-none border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  :disabled="chatsStore.isLoading"
                  @keydown.meta.enter="handleSendMessage"
                  @keydown.ctrl.enter="handleSendMessage"
                ></textarea>
              </div>
              <div class="flex flex-col justify-end">
                <button
                  type="submit"
                  data-test="submit-button"
                  :disabled="!newMessage.trim() || chatsStore.isLoading"
                  :class="[
                    'px-3 py-2 rounded-md font-medium transition-colors text-sm',
                    chatsStore.isBranchingMode 
                      ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white',
                    (!newMessage.trim() || chatsStore.isLoading) && 'bg-gray-400 cursor-not-allowed'
                  ]"
                >
                  <span v-if="chatsStore.isLoading" class="flex items-center space-x-1">
                    <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>...</span>
                  </span>
                  <span v-else-if="chatsStore.isBranchingMode">
                    🌿 Branch
                  </span>
                  <span v-else>
                    📤 Send
                  </span>
                </button>
              </div>
            </div>
            <div class="flex justify-between items-center mt-2">
              <div class="flex items-center space-x-4">
                <div class="text-xs text-gray-500">
                  ⌘+Enter or Ctrl+Enter to send
                </div>
                <div class="flex items-center space-x-2">
                  <label class="text-xs text-gray-600">Streaming:</label>
                  <button
                    type="button"
                    @click="useStreaming = !useStreaming"
                    :class="[
                      'relative inline-flex h-4 w-8 items-center rounded-full transition-colors',
                      useStreaming ? 'bg-indigo-600' : 'bg-gray-300'
                    ]"
                  >
                    <span
                      :class="[
                        'inline-block h-3 w-3 transform rounded-full bg-white transition',
                        useStreaming ? 'translate-x-4' : 'translate-x-0.5'
                      ]"
                    />
                  </button>
                  <span class="text-xs" :class="useStreaming ? 'text-indigo-600' : 'text-gray-500'">
                    {{ useStreaming ? 'SSE' : 'REST' }}
                  </span>
                </div>
              </div>
              <div class="text-xs" 
                   :class="chatsStore.isBranchingMode ? 'text-orange-600' : 'text-green-600'">
                <span v-if="chatsStore.isBranchingMode">🌿 Creating new branch</span>
                <span v-else>✅ Continuing conversation</span>
              </div>
            </div>
          </form>
        </div>
      </template>
    </ChatPanelLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatsStore } from '../stores/chats'
import { useStreamingMessage } from '../composables/useStreamingMessage'
import ChatControls from '../components/ChatControls.vue'
import ChatPanelLayout from '../components/ChatPanelLayout.vue'
import { getBranchConversationThread } from '../utils/treeHelpers'
import type { HistoryMessage, ModelDto } from '../types/api'

const route = useRoute()
const router = useRouter()
const chatsStore = useChatsStore()
const { 
  currentStreamingMessage, 
  isStreaming, 
  sendStreamingMessage, 
  initializeSSE,
  clearStreamingMessage,
  streamingMessages
} = useStreamingMessage()

const newMessage = ref('')
const selectedModelId = ref<string | null>(null)
const useStreaming = ref(true) // Toggle for streaming vs traditional

// Load chat when route changes
const chatUuid = computed(() => route.params.chatUuid as string)

watch(chatUuid, async (newChatUuid) => {
  if (newChatUuid) {
    await chatsStore.loadCompleteChat(newChatUuid)
  }
}, { immediate: true })

// Watch for streaming completion and reload chat data
watchEffect(() => {
  if (!isStreaming.value && chatUuid.value) {
    // Check if we have any completed assistant messages that aren't in the store yet
    const assistantMessages = Array.from(streamingMessages.value.values())
      .filter(msg => msg.role === 'assistant' && msg.isComplete)
    
    if (assistantMessages.length > 0) {
      // Reload chat data after a short delay to ensure backend has processed the message
      setTimeout(() => {
        if (chatUuid.value) {
          chatsStore.loadCompleteChat(chatUuid.value)
          // Clear streaming messages after reload
          assistantMessages.forEach(msg => clearStreamingMessage(msg.id))
        }
      }, 1000)
    }
  }
})

// Get conversation messages for the current thread
const conversationMessages = computed((): HistoryMessage[] => {
  return getBranchConversationThread(
    chatsStore.treeStructure,
    chatsStore.messages,
    chatsStore.selectedNodeUuid
  )
})

// Get filtered conversation messages based on system message visibility
const filteredConversationMessages = computed((): HistoryMessage[] => {
  const messages = conversationMessages.value
  if (chatsStore.showSystemMessages) {
    return messages
  }
  return messages.filter(msg => msg.role !== 'system')
})

// Get selected message details (keeping for compatibility)
const selectedMessage = computed((): HistoryMessage | null => {
  if (!chatsStore.selectedNodeUuid || !chatsStore.selectedNode) {
    return null
  }
  
  // Convert TreeNode to HistoryMessage format
  const node = chatsStore.selectedNode
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

const handleSendMessage = async () => {
  if (!newMessage.value.trim() || !chatUuid.value) {
    console.log('Cannot send message - missing content or chatUuid:', {
      hasContent: !!newMessage.value.trim(),
      chatUuid: chatUuid.value
    })
    return
  }

  console.log('Sending message:', {
    content: newMessage.value.trim(),
    chatUuid: chatUuid.value,
    isBranchingMode: chatsStore.isBranchingMode,
    selectedNode: chatsStore.selectedNodeUuid,
    useStreaming: useStreaming.value
  })

  try {
    if (useStreaming.value) {
      // Preserve selection before streaming (for branch mode restoration)
      chatsStore.preserveSelectionForStreaming()
      
      // Use SSE streaming
      await sendStreamingMessage(
        chatUuid.value,
        newMessage.value.trim(),
        chatsStore.selectedNodeUuid || undefined,
        selectedModelId.value || undefined
      )
      newMessage.value = ''
      
      // Handle completion when streaming finishes
      // This would typically be handled in a watcher or event handler
    } else {
      // Use traditional API
      const response = await chatsStore.sendMessage(newMessage.value.trim(), selectedModelId.value || undefined)
      console.log('Message sent successfully:', response)
      
      if (response) {
        newMessage.value = ''
        
        // Show appropriate feedback based on mode
        if (chatsStore.isBranchingMode) {
          console.log('🌿 New branch created! You can continue this conversation or select another node to branch again.')
          // Auto-select the new message after branching for easy continuation
          setTimeout(() => {
            // The new message should be auto-selected by the store's autoSelectLatestNode
          }, 500)
        } else {
          chatsStore.clearSelection()
        }
      }
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    // Show error to user
    chatsStore.error = error instanceof Error ? error.message : 'Failed to send message'
  }
}

// Utility function to truncate content for display
const truncateContent = (content: string): string => {
  const maxLength = 150
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}
</script>

<style scoped>
/* Prevent text selection during resize */
.resizing {
  user-select: none;
}

/* Markdown display styles */
.markdown-display :deep(.markdown-content) {
  max-height: 200px;
  overflow-y: auto;
}

.markdown-display :deep(.markdown-content)::-webkit-scrollbar {
  width: 6px;
}

.markdown-display :deep(.markdown-content)::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.markdown-display :deep(.markdown-content)::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.markdown-display :deep(.markdown-content)::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>