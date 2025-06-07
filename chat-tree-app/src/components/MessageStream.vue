<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-gray-900">
          Conversation Thread
        </h3>
        <div class="text-xs text-gray-500">
          {{ messages.length }} messages
        </div>
      </div>
      <div v-if="isBranchingMode" class="mt-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
        🌿 Showing branch from selected message
      </div>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto px-4 py-2 space-y-3" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="message.message_uuid"
        :class="[
          'flex',
          message.role === 'user' ? 'justify-end' : 'justify-start'
        ]"
      >
        <div
          :class="[
            'max-w-[80%] rounded-lg px-3 py-2',
            message.role === 'user'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900 border border-gray-200',
            selectedMessageUuid === message.message_uuid && 'ring-2 ring-orange-300'
          ]"
        >
          <!-- Message Role Header -->
          <div class="text-xs font-medium mb-1 opacity-75">
            {{ message.role === 'user' ? 'You' : 'AI' }}
            <span v-if="selectedMessageUuid === message.message_uuid" class="ml-1">
              👈 Selected
            </span>
          </div>
          
          <!-- Message Content -->
          <div
            :class="[
              'text-sm',
              message.role === 'user' ? 'text-white' : 'text-gray-900'
            ]"
          >
            <MarkdownContent 
              :content="message.content" 
              :class="message.role === 'user' ? 'user-message' : 'assistant-message'"
            />
          </div>
          
          <!-- Message Actions -->
          <div class="flex justify-end mt-2 space-x-1">
            <button
              @click="$emit('select-message', message.message_uuid)"
              :class="[
                'text-xs px-2 py-1 rounded hover:bg-black/10 transition-colors',
                message.role === 'user' ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-gray-700'
              ]"
              :title="selectedMessageUuid === message.message_uuid ? 'Already selected' : 'Select for branching'"
            >
              {{ selectedMessageUuid === message.message_uuid ? '✓' : '🌿' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Streaming Message -->
      <div 
        v-if="streamingMessage" 
        class="flex justify-start"
      >
        <StreamingMessage :message="streamingMessage" />
      </div>
      
      <!-- Empty state -->
      <div v-if="messages.length === 0 && !streamingMessage" class="flex items-center justify-center h-full">
        <div class="text-center text-gray-500">
          <svg class="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p class="text-sm">No conversation yet</p>
          <p class="text-xs mt-1">Send a message to start</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import MarkdownContent from './MarkdownContent.vue'
import StreamingMessage from './StreamingMessage.vue'
import type { HistoryMessage } from '../types/api'
import type { StreamingMessage as StreamingMessageType } from '../composables/useStreamingMessage'

interface Props {
  messages: HistoryMessage[]
  selectedMessageUuid?: string | null
  isBranchingMode?: boolean
  streamingMessage?: StreamingMessageType | null
}

const props = withDefaults(defineProps<Props>(), {
  selectedMessageUuid: null,
  isBranchingMode: false,
  streamingMessage: null
})

const emit = defineEmits<{
  'select-message': [messageUuid: string]
}>()

const messagesContainer = ref<HTMLElement>()

// Auto-scroll to bottom when new messages are added
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  }
)

// Scroll to selected message
watch(
  () => props.selectedMessageUuid,
  async (newSelectedUuid) => {
    if (newSelectedUuid && messagesContainer.value) {
      await nextTick()
      const selectedElement = messagesContainer.value.querySelector(`[data-message-uuid="${newSelectedUuid}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }
)
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* User message markdown styling */
:deep(.user-message .markdown-content) {
  color: inherit;
}

:deep(.user-message .markdown-content code) {
  background-color: rgba(255, 255, 255, 0.2);
  color: inherit;
}

:deep(.user-message .markdown-content pre) {
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Assistant message markdown styling */
:deep(.assistant-message .markdown-content) {
  color: inherit;
}

:deep(.assistant-message .markdown-content code) {
  background-color: #f3f4f6;
  color: #374151;
}

:deep(.assistant-message .markdown-content pre) {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
}
</style>