<template>
  <div class="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white">
    <!-- Header -->
    <div class="flex-shrink-0 px-6 py-4 border-b border-gray-200/50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">
          💬 Conversation Thread
        </h3>
        <div class="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {{ mergedMessages.displayMessages.length + mergedMessages.streamingOnlyMessages.length }} messages
        </div>
      </div>
      <div v-if="isBranchingMode" class="mt-2 state-badge state-branching">
        🌿 Branching mode active
      </div>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4" ref="messagesContainer">
      <!-- Display existing messages from store (with deduplication) -->
      <div
        v-for="(message, index) in mergedMessages.displayMessages"
        :key="message.message_uuid"
        :class="[
          'flex',
          message.role === 'user' ? 'justify-end' : 'justify-start'
        ]"
      >
        <div
          :class="[
            message.role === 'user'
              ? 'message-bubble-user ml-auto'
              : 'message-bubble-assistant',
            selectedMessageUuid === message.message_uuid && 'ring-4 ring-orange-400/50'
          ]"
        >
          <!-- Message Role Header -->
          <div class="text-xs font-medium mb-2 flex items-center justify-between">
            <span :class="message.role === 'user' ? 'text-white/80' : 'text-gray-600'">
              {{ message.role === 'user' ? '👤 You' : '🤖 AI' }}
            </span>
            <span v-if="selectedMessageUuid === message.message_uuid" class="state-badge state-branching text-xs py-0 px-2">
              ✓ Selected
            </span>
          </div>
          
          <!-- Message Content -->
          <div class="text-sm leading-relaxed">
            <MarkdownContent 
              :content="message.content" 
              :class="message.role === 'user' ? 'user-message' : 'assistant-message'"
            />
          </div>
          
          <!-- Message Actions -->
          <div class="flex justify-end mt-3">
            <button
              @click="$emit('select-message', message.message_uuid)"
              :class="[
                'btn-ghost text-xs px-3 py-1',
                message.role === 'user' 
                  ? 'text-white/70 hover:text-white hover:bg-white/20' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              ]"
              :title="selectedMessageUuid === message.message_uuid ? 'Already selected' : 'Select for branching'"
            >
              {{ selectedMessageUuid === message.message_uuid ? '✓ Selected' : '🌿 Select' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Display streaming messages (user and assistant, deduplicated) -->
      <template v-if="mergedMessages.streamingOnlyMessages.length > 0">
        <template v-for="msg in mergedMessages.streamingOnlyMessages" :key="`streaming-${msg.id}`">
          <!-- User streaming message -->
          <div
            v-if="msg.role === 'user'"
            :class="[
              'flex justify-end'
            ]"
          >
            <div class="message-bubble-user ml-auto">
              <div class="text-xs font-medium mb-2 text-white/80">👤 You</div>
              <div class="text-sm leading-relaxed">
                <MarkdownContent 
                  :content="msg.content" 
                  class="user-message"
                />
              </div>
            </div>
          </div>
          
          <!-- Assistant streaming message -->
          <div
            v-else
            :class="[
              'flex justify-start'
            ]"
          >
            <StreamingMessage 
              :message="msg" 
            />
          </div>
        </template>
      </template>
      
      <!-- Fallback: Current streaming message if no streamingMessages prop -->
      <div 
        v-else-if="streamingMessage" 
        class="flex justify-start"
      >
        <StreamingMessage :message="streamingMessage" />
      </div>
      
      <!-- Empty state -->
      <div v-if="mergedMessages.displayMessages.length === 0 && !streamingMessage && mergedMessages.streamingOnlyMessages.length === 0" class="flex items-center justify-center h-full">
        <div class="text-center text-gray-500 bg-white rounded-2xl p-8 shadow-soft border border-gray-100">
          <div class="bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg class="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p class="text-lg font-medium text-gray-900 mb-2">Start a conversation</p>
          <p class="text-sm text-gray-500">Send your first message to begin chatting</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import MarkdownContent from './MarkdownContent.vue'
import StreamingMessage from './StreamingMessage.vue'
import { mergeMessagesWithoutDuplication } from '../utils/messageDeduplication'
import type { HistoryMessage } from '../types/api'
import type { StreamingMessage as StreamingMessageType } from '../composables/useStreamingMessage'

interface Props {
  messages: HistoryMessage[]
  selectedMessageUuid?: string | null
  isBranchingMode?: boolean
  streamingMessage?: StreamingMessageType | null
  streamingMessages?: Map<string, StreamingMessageType> | null
}

const props = withDefaults(defineProps<Props>(), {
  selectedMessageUuid: null,
  isBranchingMode: false,
  streamingMessage: null,
  streamingMessages: null
})

const emit = defineEmits<{
  'select-message': [messageUuid: string]
}>()

const messagesContainer = ref<HTMLElement>()

// Merge messages while avoiding duplication
const mergedMessages = computed(() => {
  if (!props.streamingMessages || props.streamingMessages.size === 0) {
    return {
      displayMessages: props.messages,
      streamingOnlyMessages: []
    }
  }
  
  return mergeMessagesWithoutDuplication(props.messages, props.streamingMessages)
})

// Auto-scroll to bottom when new messages are added
watch(
  () => mergedMessages.value.displayMessages.length,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  }
)

// Auto-scroll when streaming messages change
watch(
  () => mergedMessages.value.streamingOnlyMessages.length,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  }
)

// Auto-scroll when streaming message content updates
watch(
  () => props.streamingMessage?.content,
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