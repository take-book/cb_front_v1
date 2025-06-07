<template>
  <AppLayout>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Chats</h1>
        <p class="text-gray-600 mt-1">Manage your conversations</p>
      </div>

      <!-- Actions Bar -->
      <div class="mb-6 flex flex-col gap-4">
        <!-- Model Selector -->
        <div class="bg-white p-4 rounded-lg shadow-sm border">
          <ModelSelector 
            v-model="selectedModelId"
            @model-selected="handleModelSelected"
            :show-details="true"
            :auto-select="true"
          />
        </div>
        
        <div class="flex flex-col sm:flex-row gap-4">
          <button
            @click="handleNewChat"
            :disabled="chatsStore.isLoading"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
          >
            New Chat
          </button>
          
          <input
            v-model="searchQuery"
            @input="handleSearch"
            type="search"
            placeholder="Search chats..."
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="chatsStore.isLoading" class="text-center py-12">
        <p class="text-gray-500">Loading...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="chatsStore.error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Backend Server Error</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{{ chatsStore.error }}</p>
              <p class="mt-1">Make sure the backend server is running at <code class="bg-red-100 px-1 rounded">http://localhost:8000</code></p>
            </div>
            <div class="mt-4">
              <button 
                @click="chatsStore.fetchRecentChats()"
                class="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="chatsStore.recentChats.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No chats yet</h3>
        <p class="mt-1 text-sm text-gray-500">Start a new conversation to get started.</p>
      </div>

      <!-- Chat List -->
      <div v-else class="space-y-4">
        <div
          v-for="chat in chatsStore.recentChats"
          :key="chat.uuid"
          data-test="chat-item"
          class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex items-center justify-between">
            <RouterLink
              :to="`/chats/${chat.uuid}`"
              class="flex-1 block"
              @click="logChatNavigation(chat)"
            >
              <h3 class="text-lg font-medium text-gray-900">{{ chat.title }}</h3>
              <div class="mt-1 flex items-center text-sm text-gray-500 space-x-4">
                <span>{{ chat.message_count }} messages</span>
                <span>{{ formatDate(chat.updated_at) }}</span>
              </div>
            </RouterLink>
            
            <button
              @click.stop="handleDeleteChat(chat.uuid)"
              data-test="delete-chat"
              class="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="chatsStore.totalPages > 1" class="mt-6 flex justify-center space-x-2">
        <button
          v-for="page in chatsStore.totalPages"
          :key="page"
          @click="loadPage(page)"
          :class="[
            'px-3 py-1 rounded',
            page === chatsStore.currentPage
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          ]"
        >
          {{ page }}
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatsStore } from '../stores/chats'
import { useAuthStore } from '../stores/auth'
import { healthCheck } from '../api/client'
import ModelSelector from '../components/ModelSelector.vue'
import AppLayout from '../components/AppLayout.vue'
import type { ModelDto } from '../types/api'

const router = useRouter()
const chatsStore = useChatsStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const selectedModelId = ref<string | null>(null)
let searchTimeout: number | undefined

onMounted(async () => {
  try {
    await chatsStore.fetchRecentChats()
  } catch (error) {
    console.error('Failed to load chats:', error)
    // Show a user-friendly error message
  }
})

const handleModelSelected = (model: ModelDto | null) => {
  if (model) {
    selectedModelId.value = model.id
  }
}

const handleNewChat = async () => {
  try {
    console.log('Creating new chat...')
    console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
    
    const chatUuid = await chatsStore.createNewChat(undefined, selectedModelId.value || undefined)
    if (chatUuid) {
      console.log('Chat created successfully:', chatUuid)
      console.log('Navigating to:', `/chats/${chatUuid}`)
      await router.push(`/chats/${chatUuid}`)
      console.log('Navigation complete')
    }
  } catch (error: any) {
    console.error('Failed to create chat - Full error object:', error)
    
    // More detailed error logging
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
      console.error('Response headers:', error.response.headers)
      
      if (error.response.status === 401) {
        alert('Authentication failed. Please log in again.')
        authStore.logout()
        router.push('/login')
        return
      }
      
      const errorMessage = error.response.data?.detail || `HTTP ${error.response.status}: ${error.response.statusText}`
      alert(`Failed to create chat: ${errorMessage}`)
    } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      alert('Network Error: Cannot connect to backend server. Please ensure the backend server is running at http://localhost:8000')
      return
    } else {
      console.error('Request config:', error.config)
      alert(`Failed to create chat: ${error.message}`)
    }
  }
}

const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = window.setTimeout(() => {
    if (searchQuery.value) {
      chatsStore.searchChats(searchQuery.value)
    } else {
      chatsStore.fetchRecentChats()
    }
  }, 300)
}

const handleDeleteChat = async (chatUuid: string) => {
  if (confirm('Are you sure you want to delete this chat?')) {
    try {
      await chatsStore.deleteChat(chatUuid)
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const loadPage = (page: number) => {
  if (searchQuery.value) {
    chatsStore.searchChats(searchQuery.value, page)
  } else {
    chatsStore.fetchRecentChats(page)
  }
}

const logChatNavigation = (chat: any) => {
  console.log('Navigating to chat:', {
    uuid: chat.uuid,
    title: chat.title,
    linkUrl: `/chats/${chat.uuid}`,
    chatObject: chat
  })
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}
</script>