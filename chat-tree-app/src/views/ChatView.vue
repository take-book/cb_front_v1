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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChatsStore } from '@/stores/chats'
import ChatTreeView from '@/components/ChatTreeView.vue'

const route = useRoute()
const chatsStore = useChatsStore()

const newMessage = ref('')
const selectedNodeId = ref<string | null>(null)

const currentPath = computed(() => {
  return chatsStore.currentPath
})

const selectedMessage = computed(() => {
  if (!selectedNodeId.value) return null
  return chatsStore.currentChatHistory.find(m => m.message_uuid === selectedNodeId.value)
})

onMounted(async () => {
  const chatId = route.params.chatId as string
  if (chatId) {
    await chatsStore.loadChat(chatId)
    // Select the last message by default
    if (chatsStore.currentChatHistory.length > 0) {
      selectedNodeId.value = chatsStore.currentChatHistory[chatsStore.currentChatHistory.length - 1].message_uuid
    }
  }
})

// Watch for changes in chat history to update selected node
watch(() => chatsStore.currentChatHistory, (newHistory) => {
  if (newHistory.length > 0 && !selectedNodeId.value) {
    selectedNodeId.value = newHistory[newHistory.length - 1].message_uuid
  }
}, { deep: true })

const handleSendMessage = async () => {
  if (!newMessage.value.trim()) return

  try {
    const response = await chatsStore.sendMessage(newMessage.value)
    newMessage.value = ''
    
    // Select the new message
    selectedNodeId.value = response.message_uuid
  } catch (error) {
    console.error('Failed to send message:', error)
  }
}

const handleNodeClick = async (nodeId: string) => {
  try {
    selectedNodeId.value = nodeId
    await chatsStore.selectNode(nodeId)
  } catch (error) {
    console.error('Failed to select node:', error)
  }
}
</script>