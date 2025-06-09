<template>
  <div 
    v-if="message"
    class="message-bubble-assistant animate-fade-in-up"
  >
    <!-- Message Role Header -->
    <div class="text-xs font-medium mb-2 flex items-center justify-between">
      <span class="text-gray-600">🤖 AI</span>
      <div class="flex items-center space-x-2">
        <div v-if="!message.isComplete" class="state-badge state-streaming">
          <div class="typing-indicator mr-2">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
          Typing...
        </div>
        <div v-else class="state-badge state-continuing">
          ✓ Complete
        </div>
      </div>
    </div>
    
    <!-- Streaming Content -->
    <div class="text-sm leading-relaxed">
      <MarkdownContent 
        :content="message.content" 
        class="assistant-message"
      />
      <span 
        v-if="!message.isComplete" 
        class="streaming-cursor animate-pulse ml-1"
      >
        ▊
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarkdownContent from './MarkdownContent.vue'
import type { StreamingMessage } from '../composables/useStreamingMessage'

interface Props {
  message: StreamingMessage | null
}

defineProps<Props>()
</script>

<style scoped>
.typing-indicator {
  display: flex;
  align-items: center;
  space-x: 2px;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #4f46e5;
  animation: typing 1.4s infinite ease-in-out;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.streaming-cursor {
  color: #4f46e5;
  font-weight: bold;
  font-size: 16px;
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