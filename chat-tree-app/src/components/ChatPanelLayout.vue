<template>
  <ResizablePanels class="flex-1">
    <template #left>
      <div class="p-4 h-full">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center h-full" data-test="loading">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p class="mt-2 text-gray-500">Loading chat...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex items-center justify-center h-full" data-test="error">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Error</h3>
            <p class="mt-1 text-sm text-gray-500">{{ error }}</p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="messages.length === 0" class="flex items-center justify-center h-full" data-test="empty-state">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Start a conversation</h3>
            <p class="mt-1 text-sm text-gray-500">Send your first message to begin the chat.</p>
          </div>
        </div>

        <!-- Chat Tree -->
        <ChatTreeView
          v-else
          :tree-structure="treeStructure"
          :selected-node-uuid="selectedNodeUuid"
          :current-path="currentPath"
          :show-system-messages="showSystemMessages"
          @node-click="handleNodeClick"
        />
      </div>
    </template>

    <template #right>
      <div class="bg-white border-l border-gray-200 flex flex-col h-full">
        <!-- Message Stream (Top) -->
        <div class="flex-1 min-h-0">
          <MessageStream
            :messages="filteredConversationMessages || []"
            :selected-message-uuid="selectedNodeUuid"
            :is-branching-mode="isBranchingMode"
            :streaming-message="streamingMessage"
            :streaming-messages="streamingMessages"
            @select-message="handleMessageSelect"
          />
        </div>

        <!-- Mode Indicator -->
        <div v-if="selectedNodeUuid" 
             class="px-4 py-2 border-t border-b"
             :class="isBranchingMode ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div v-if="isBranchingMode" 
                   class="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                🌿 Branching mode
              </div>
              <div v-else 
                   class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                ✅ Continue mode
              </div>
            </div>
            <button 
              @click="handleClearSelection"
              class="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-white/50">
              Clear
            </button>
          </div>
          <div class="text-xs mt-1" 
               :class="isBranchingMode ? 'text-orange-600' : 'text-green-600'">
            <span v-if="isBranchingMode">
              🌿 Your next message will create a new conversation branch
            </span>
            <span v-else>
              ✅ Your next message will continue the conversation normally  
            </span>
          </div>
        </div>

        <!-- Input Section Slot -->
        <div class="flex-shrink-0">
          <slot name="input" />
        </div>
      </div>
    </template>
  </ResizablePanels>
</template>

<script setup lang="ts">
import ChatTreeView from './ChatTreeView.vue'
import MessageStream from './MessageStream.vue'
import ResizablePanels from './ResizablePanels.vue'
import type { TreeNode, HistoryMessage } from '../types/api'
import type { StreamingMessage } from '../composables/useStreamingMessage'

interface Props {
  isLoading: boolean
  error: string | null
  treeStructure: TreeNode | null
  messages: HistoryMessage[]
  selectedNodeUuid: string | null
  currentPath: TreeNode[]
  showSystemMessages: boolean
  isBranchingMode: boolean
  filteredConversationMessages?: HistoryMessage[]
  streamingMessage?: StreamingMessage | null
  streamingMessages?: Map<string, StreamingMessage> | null
}

defineProps<Props>()

const emit = defineEmits<{
  'node-click': [nodeUuid: string]
  'select-message': [messageUuid: string]
  'clear-selection': []
}>()

const handleNodeClick = (nodeUuid: string) => {
  emit('node-click', nodeUuid)
}

const handleMessageSelect = (messageUuid: string) => {
  emit('select-message', messageUuid)
}

const handleClearSelection = () => {
  emit('clear-selection')
}
</script>