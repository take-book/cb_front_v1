<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Header Controls -->
    <ChatControls 
      :show-system-messages="showSystemMessages"
      :message-count="messages.length"
      :chat-title="chatTitle"
      :show-model-selector="true"
      :selected-model-id="selectedModelId"
      @toggle-system-messages="handleToggleSystemMessages"
      @model-selected="handleModelSelected"
    />

    <!-- Main Chat Panel Layout -->
    <ChatPanelLayout
      :is-loading="isLoading"
      :error="error"
      :tree-structure="treeStructure"
      :messages="messages"
      :selected-node-uuid="selectedNodeUuid"
      :current-path="currentPath"
      :show-system-messages="showSystemMessages"
      :is-branching-mode="isBranchingMode"
      :filtered-conversation-messages="filteredConversationMessages"
      :streaming-message="currentStreamingMessage"
      :streaming-messages="streamingMessages"
      @node-click="handleNodeClick"
      @select-message="handleMessageSelect"
      @clear-selection="handleClearSelection"
    >
      <template #input>
        <MessageInput
          v-model="newMessage"
          v-model:use-streaming="useStreaming"
          :is-loading="isLoading"
          :is-branching-mode="isBranchingMode"
          @submit="handleSendMessage"
        />
      </template>
    </ChatPanelLayout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChatCoordination } from '../composables/useChatCoordination'
import { useChatStreaming } from '../composables/useChatStreaming'
import ChatControls from '../components/ChatControls.vue'
import ChatPanelLayout from '../components/ChatPanelLayout.vue'
import MessageInput from '../components/MessageInput.vue'

// Use composables for state management
const {
  chatUuid,
  selectedModelId,
  filteredConversationMessages,
  isLoading,
  error,
  chatTitle,
  messages,
  treeStructure,
  selectedNodeUuid,
  currentPath,
  showSystemMessages,
  isBranchingMode,
  handleNodeClick,
  handleMessageSelect,
  handleModelSelected,
  handleClearSelection,
  handleToggleSystemMessages
} = useChatCoordination()

const {
  useStreaming,
  currentStreamingMessage,
  streamingMessages,
  sendMessage
} = useChatStreaming()

// Local UI state
const newMessage = ref('')

// Simplified message sending handler
const handleSendMessage = async (message: string) => {
  if (!message.trim() || !chatUuid.value) {
    return
  }

  // Clear the message input immediately after getting the message
  newMessage.value = ''

  try {
    await sendMessage(
      chatUuid.value,
      message.trim(),
      selectedNodeUuid.value || undefined,
      selectedModelId.value || undefined
    )
  } catch (error) {
    // Restore the message if there was an error
    newMessage.value = message
  }
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