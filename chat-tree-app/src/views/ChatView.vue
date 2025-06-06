<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center space-x-4">
            <RouterLink 
              to="/chats" 
              class="text-gray-500 hover:text-gray-700"
              data-test="back-link"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </RouterLink>
            <h1 class="text-xl font-semibold text-gray-900">
              {{ chatsStore.chatTitle }}
            </h1>
          </div>
          <div class="text-sm text-gray-500">
            {{ chatsStore.messages.length || 0 }} messages
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden" ref="mainContent">
      <!-- Tree View -->
      <div class="p-4" :style="{ width: `${leftPanelWidth}px` }">
        <!-- Loading State -->
        <div v-if="chatsStore.isLoading" class="flex items-center justify-center h-full" data-test="loading">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p class="mt-2 text-gray-500">Loading chat...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="chatsStore.error" class="flex items-center justify-center h-full" data-test="error">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Error</h3>
            <p class="mt-1 text-sm text-gray-500">{{ chatsStore.error }}</p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="chatsStore.messages.length === 0" class="flex items-center justify-center h-full" data-test="empty-state">
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
          :tree-structure="chatsStore.treeStructure"
          :selected-node-uuid="chatsStore.selectedNodeUuid"
          :current-path="chatsStore.currentPath"
          @node-click="handleNodeClick"
        />
      </div>

      <!-- Resizable Divider -->
      <div 
        class="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize transition-colors relative"
        @mousedown="startResize"
      >
        <div class="absolute inset-y-0 -left-1 -right-1 z-10"></div>
      </div>

      <!-- Right Panel: Message Stream + Input -->
      <div class="bg-white border-l border-gray-200 flex flex-col" :style="{ width: `${rightPanelWidth}px` }">
        <!-- Message Stream (Top) -->
        <div class="flex-1 min-h-0">
          <MessageStream
            :messages="conversationMessages"
            :selected-message-uuid="chatsStore.selectedNodeUuid"
            :is-branching-mode="chatsStore.isBranchingMode"
            @select-message="handleMessageSelect"
          />
        </div>

        <!-- Mode Indicator -->
        <div v-if="chatsStore.selectedNodeUuid" 
             class="px-4 py-2 border-t border-b"
             :class="chatsStore.isBranchingMode ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div v-if="chatsStore.isBranchingMode" 
                   class="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                🌿 Branching mode
              </div>
              <div v-else 
                   class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                ✅ Continue mode
              </div>
            </div>
            <button 
              @click="chatsStore.clearSelection()"
              class="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-white/50">
              Clear
            </button>
          </div>
          <div class="text-xs mt-1" 
               :class="chatsStore.isBranchingMode ? 'text-orange-600' : 'text-green-600'">
            <span v-if="chatsStore.isBranchingMode">
              🌿 Your next message will create a new conversation branch
            </span>
            <span v-else>
              ✅ Your next message will continue the conversation normally  
            </span>
          </div>
        </div>

        <!-- Compact Message Input (Bottom) -->
        <div class="flex-shrink-0 p-4 bg-gray-50 border-t border-gray-200">
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
              <div class="text-xs text-gray-500">
                ⌘+Enter or Ctrl+Enter to send
              </div>
              <div class="text-xs" 
                   :class="chatsStore.isBranchingMode ? 'text-orange-600' : 'text-green-600'">
                <span v-if="chatsStore.isBranchingMode">🌿 Creating new branch</span>
                <span v-else>✅ Continuing conversation</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatsStore } from '../stores/chats'
import ChatTreeView from '../components/ChatTreeView.vue'
import MessageStream from '../components/MessageStream.vue'
import MarkdownContent from '../components/MarkdownContent.vue'
import { getBranchConversationThread } from '../utils/treeHelpers'
import type { HistoryMessage, TreeNode } from '../types/api'

const route = useRoute()
const router = useRouter()
const chatsStore = useChatsStore()

const newMessage = ref('')
const mainContent = ref<HTMLElement>()

// Resizable panels state  
const leftPanelWidth = ref(Math.max(300, window.innerWidth - 600)) // Default: window width - 600px for right panel
const rightPanelWidth = ref(500) // Default right panel width (increased to accommodate message stream)
const isResizing = ref(false)

// Load chat when route changes
const chatUuid = computed(() => route.params.chatUuid as string)

watch(chatUuid, async (newChatUuid) => {
  if (newChatUuid) {
    await chatsStore.loadCompleteChat(newChatUuid)
  }
}, { immediate: true })

// Get conversation messages for the current thread
const conversationMessages = computed((): HistoryMessage[] => {
  return getBranchConversationThread(
    chatsStore.treeStructure,
    chatsStore.messages,
    chatsStore.selectedNodeUuid
  )
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
    selectedNode: chatsStore.selectedNodeUuid
  })

  try {
    const response = await chatsStore.sendMessage(newMessage.value.trim())
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

// Resizable divider functions
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startLeftWidth = leftPanelWidth.value
  const startRightWidth = rightPanelWidth.value

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value || !mainContent.value) return
    
    const deltaX = e.clientX - startX
    const containerWidth = mainContent.value.offsetWidth
    
    // Calculate new widths with constraints
    const newLeftWidth = Math.max(300, Math.min(containerWidth - 450, startLeftWidth + deltaX))
    const newRightWidth = containerWidth - newLeftWidth - 5 // 5px for divider
    
    leftPanelWidth.value = newLeftWidth
    rightPanelWidth.value = Math.max(450, newRightWidth)
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    // Save panel sizes to localStorage
    localStorage.setItem('chatview-left-panel-width', leftPanelWidth.value.toString())
    localStorage.setItem('chatview-right-panel-width', rightPanelWidth.value.toString())
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// Restore panel sizes from localStorage
onMounted(() => {
  const savedLeftWidth = localStorage.getItem('chatview-left-panel-width')
  const savedRightWidth = localStorage.getItem('chatview-right-panel-width')
  
  if (savedLeftWidth) leftPanelWidth.value = parseInt(savedLeftWidth)
  if (savedRightWidth) rightPanelWidth.value = parseInt(savedRightWidth)
  
  // Handle window resize
  window.addEventListener('resize', handleWindowResize)
})

const handleWindowResize = () => {
  // Adjust panel widths to fit new window size
  const totalWidth = window.innerWidth
  const minLeftWidth = 300
  const minRightWidth = 450
  
  if (leftPanelWidth.value + rightPanelWidth.value + 5 > totalWidth) {
    const availableWidth = totalWidth - 5
    const ratio = leftPanelWidth.value / (leftPanelWidth.value + rightPanelWidth.value)
    
    leftPanelWidth.value = Math.max(minLeftWidth, Math.floor(availableWidth * ratio))
    rightPanelWidth.value = Math.max(minRightWidth, availableWidth - leftPanelWidth.value)
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