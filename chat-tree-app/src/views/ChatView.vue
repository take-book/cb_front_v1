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
        <MessageInput
          v-model="newMessage"
          v-model:use-streaming="useStreaming"
          :is-loading="chatsStore.isLoading"
          :is-branching-mode="chatsStore.isBranchingMode"
          @submit="handleSendMessage"
        />
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
import MessageInput from '../components/MessageInput.vue'
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

const handleSendMessage = async (message: string) => {
  if (!message.trim() || !chatUuid.value) {
    console.log('Cannot send message - missing content or chatUuid:', {
      hasContent: !!message.trim(),
      chatUuid: chatUuid.value
    })
    return
  }

  console.log('Sending message:', {
    content: message.trim(),
    chatUuid: chatUuid.value,
    isBranchingMode: chatsStore.isBranchingMode,
    selectedNode: chatsStore.selectedNodeUuid,
    useStreaming: useStreaming.value
  })

  // Clear the message input immediately after getting the message
  newMessage.value = ''

  try {
    if (useStreaming.value) {
      // Preserve selection before streaming (for branch mode restoration)
      chatsStore.preserveSelectionForStreaming()
      
      // Use SSE streaming
      await sendStreamingMessage(
        chatUuid.value,
        message.trim(),
        chatsStore.selectedNodeUuid || undefined,
        selectedModelId.value || undefined
      )
      
      // Handle completion when streaming finishes
      // This would typically be handled in a watcher or event handler
    } else {
      // Use traditional API
      const response = await chatsStore.sendMessage(message.trim(), selectedModelId.value || undefined)
      console.log('Message sent successfully:', response)
      
      if (response) {
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
    // Restore the message if there was an error
    newMessage.value = message
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