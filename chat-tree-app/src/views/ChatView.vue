<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center space-x-4">
            <RouterLink to="/chats" class="text-gray-500 hover:text-gray-700">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </RouterLink>
            <h1 class="text-xl font-semibold text-gray-900">
              {{ chatsStore.currentChat?.title || 'Chat' }}
            </h1>
          </div>
          <div class="text-sm text-gray-500">
            {{ chatsStore.currentChat?.message_count || 0 }} messages
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Tree View -->
      <div class="flex-1 p-4">
        <!-- Loading State -->
        <div v-if="chatsStore.loading" class="flex items-center justify-center h-full">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p class="mt-2 text-gray-500">Loading chat...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="chatsStore.error" class="flex items-center justify-center h-full">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Error</h3>
            <p class="mt-1 text-sm text-gray-500">{{ chatsStore.error }}</p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="chatsStore.currentChatHistory.length === 0" class="flex items-center justify-center h-full">
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
          :messages="chatsStore.currentChatHistory"
          :current-path="currentPath"
          :selected-node-id="selectedNodeId"
          :tree-structure="chatsStore.currentTreeStructure"
          @node-click="handleNodeClick"
        />
      </div>

      <!-- Message Input Sidebar -->
      <div class="w-96 bg-white border-l border-gray-200 flex flex-col">
        <!-- Selected Message Display -->
        <div v-if="selectedMessage" class="p-4 border-b border-gray-200 bg-gray-50">
          <div class="text-xs font-semibold text-gray-600 mb-1">
            {{ selectedMessage.role === 'user' ? 'You' : 'AI' }}
          </div>
          <div class="text-sm text-gray-900">{{ selectedMessage.content }}</div>
        </div>

        <!-- Message Input -->
        <div class="flex-1 flex flex-col p-4">
          <form @submit.prevent="handleSendMessage" data-test="message-form" class="h-full flex flex-col">
            <label for="message" class="block text-sm font-medium text-gray-700 mb-2">
              Send a message
            </label>
            <textarea
              id="message"
              v-model="newMessage"
              data-test="message-input"
              placeholder="Type your message here..."
              rows="4"
              class="flex-1 resize-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            ></textarea>
            
            <div class="mt-4 flex justify-end">
              <button
                type="submit"
                data-test="send-button"
                :disabled="!newMessage.trim() || chatsStore.loading"
                class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {{ chatsStore.loading ? 'Sending...' : 'Send' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Toast notifications -->
    <Toast
      v-for="toastItem in toast.toasts.value"
      :key="toastItem.id"
      :type="toastItem.type"
      :title="toastItem.title"
      :message="toastItem.message"
      :duration="toastItem.duration"
      :show="true"
      @close="toast.removeToast(toastItem.id)"
    />
    
    <!-- Success indicator for testing -->
    <div v-if="toast.toasts.value.length > 0" data-test="message-success" class="hidden">Success</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChatsStore } from '@/stores/chats'
import { useToast } from '@/composables/useToast'
import ChatTreeView from '@/components/ChatTreeView.vue'
import Toast from '@/components/Toast.vue'

const route = useRoute()
const chatsStore = useChatsStore()
const toast = useToast()

const newMessage = ref('')
const selectedNodeId = ref<string | null>(null)
const isUserSelecting = ref(false) // Flag to track user-initiated selections

const currentPath = computed(() => {
  return chatsStore.currentPath
})

const selectedMessage = computed(() => {
  if (!selectedNodeId.value) return null
  
  // First try to find in current history
  const messageInHistory = chatsStore.currentChatHistory.find(m => m.message_uuid === selectedNodeId.value)
  if (messageInHistory) {
    return messageInHistory
  }
  
  // If not found in current history, create a placeholder based on tree structure
  if (chatsStore.currentTreeStructure) {
    const findMessageInTree = (node: any): any => {
      if (node.uuid === selectedNodeId.value) {
        // Return a placeholder message - in a real app you might fetch this from API
        return {
          message_uuid: node.uuid,
          role: 'unknown',
          content: 'Message from different branch'
        }
      }
      for (const child of node.children) {
        const found = findMessageInTree(child)
        if (found) return found
      }
      return null
    }
    
    return findMessageInTree(chatsStore.currentTreeStructure.tree)
  }
  
  return null
})

onMounted(async () => {
  const chatId = route.params.chatId as string
  if (chatId) {
    await chatsStore.loadChat(chatId)
    // Set selectedNodeId to current node from API, or fallback to last message
    if (chatsStore.currentTreeStructure?.current_node_uuid) {
      selectedNodeId.value = chatsStore.currentTreeStructure.current_node_uuid
    } else if (chatsStore.currentChatHistory.length > 0) {
      selectedNodeId.value = chatsStore.currentChatHistory[chatsStore.currentChatHistory.length - 1].message_uuid
    }
  }
})

// Watch for changes in tree structure to update selected node (only when not user-selecting)
watch(() => chatsStore.currentTreeStructure, (newTreeStructure, oldTreeStructure) => {
  if (newTreeStructure?.current_node_uuid && !isUserSelecting.value) {
    // Only update if this is an initial load or if selectedNodeId is null
    if (!selectedNodeId.value || !oldTreeStructure) {
      selectedNodeId.value = newTreeStructure.current_node_uuid
    }
  }
}, { deep: true })

// Watch for changes in chat history to update selected node (only if no tree structure)
watch(() => chatsStore.currentChatHistory, (newHistory, oldHistory) => {
  // Only auto-select if no tree structure available and no node is currently selected
  if (newHistory.length > 0 && !chatsStore.currentTreeStructure?.current_node_uuid && (!selectedNodeId.value || !oldHistory || oldHistory.length === 0)) {
    selectedNodeId.value = newHistory[newHistory.length - 1].message_uuid
  }
}, { deep: true })

const handleSendMessage = async () => {
  if (!newMessage.value.trim()) return

  try {
    isUserSelecting.value = true
    
    // Ensure the currently selected node is set before sending message
    if (selectedNodeId.value) {
      await chatsStore.selectNode(selectedNodeId.value)
    }
    
    const response = await chatsStore.sendMessage(newMessage.value)
    newMessage.value = ''
    
    // Select the new assistant message after the store has been updated
    selectedNodeId.value = response.message_uuid
    
    // Show success feedback
    toast.success('Message sent', 'Your message has been sent successfully')
  } catch (error) {
    console.error('Failed to send message:', error)
    toast.error('Failed to send message', 'Please try again')
  } finally {
    // Reset the flag after a short delay to allow API updates to complete
    setTimeout(() => {
      isUserSelecting.value = false
    }, 200)
  }
}

const handleNodeClick = async (nodeId: string) => {
  try {
    isUserSelecting.value = true
    selectedNodeId.value = nodeId
    await chatsStore.selectNode(nodeId)
    
    // Keep the user-selected node rather than overwriting with API response
    selectedNodeId.value = nodeId
  } catch (error) {
    console.error('Failed to select node:', error)
    // Revert selectedNodeId on error
    if (chatsStore.currentTreeStructure) {
      selectedNodeId.value = chatsStore.currentTreeStructure.current_node_uuid
    }
  } finally {
    // Reset the flag after a short delay to allow API updates to complete
    setTimeout(() => {
      isUserSelecting.value = false
    }, 100)
  }
}
</script>