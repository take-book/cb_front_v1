<template>
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
            {{ chatTitle }}
          </h1>
        </div>
        <div class="flex items-center space-x-4">
          <button
            @click="handleToggleSystemMessages"
            data-test="system-messages-toggle"
            class="system-messages-toggle flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors hover:bg-gray-100"
            :class="showSystemMessages ? 'text-gray-700 bg-gray-50' : 'text-gray-500'"
          >
            <span class="system-toggle-icon">
              {{ showSystemMessages ? '👁️' : '🙈' }}
            </span>
            <span>
              {{ showSystemMessages ? 'Hide System Messages' : 'Show System Messages' }}
            </span>
          </button>
          <div class="text-sm text-gray-500">
            {{ messageCount || 0 }} messages
          </div>
        </div>
      </div>
    </div>
    
    <!-- Model Selector Section -->
    <div v-if="showModelSelector" class="border-t bg-gray-50 px-4 sm:px-6 lg:px-8 py-3">
      <div class="max-w-7xl mx-auto">
        <ModelSelector 
          v-model="selectedModelId"
          @model-selected="handleModelSelected"
          :show-details="false"
          :auto-select="true"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ModelSelector from './ModelSelector.vue'
import type { ModelDto } from '../types/api'

interface Props {
  showSystemMessages: boolean
  messageCount: number
  chatTitle: string
  showModelSelector?: boolean
  selectedModelId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  showModelSelector: false,
  selectedModelId: null
})

const emit = defineEmits<{
  'toggle-system-messages': []
  'model-selected': [model: ModelDto | null]
}>()

const selectedModelId = ref(props.selectedModelId)

// Watch for prop changes
watch(() => props.selectedModelId, (newValue) => {
  selectedModelId.value = newValue
})

const handleToggleSystemMessages = () => {
  emit('toggle-system-messages')
}

const handleModelSelected = (model: ModelDto | null) => {
  if (model) {
    selectedModelId.value = model.id
  }
  emit('model-selected', model)
}
</script>