<template>
  <div class="model-selector">
    <div class="flex items-center gap-3">
      <label for="model-select" class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Model:
      </label>
      
      <div class="relative">
        <select
          id="model-select"
          v-model="selectedModelId"
          @change="handleModelChange"
          :disabled="modelsStore.isLoading"
          class="block w-48 px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                 dark:bg-gray-700 dark:border-gray-600 dark:text-white
                 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="" disabled>Select a model...</option>
          <optgroup 
            v-for="category in modelsStore.modelCategories" 
            :key="category" 
            :label="category"
          >
            <option 
              v-for="model in getModelsByCategory(category)" 
              :key="model.id" 
              :value="model.id"
              :title="model.description"
            >
              {{ model.name }}
              <span v-if="model.context_length" class="text-xs text-gray-500">
                ({{ formatContextLength(model.context_length) }})
              </span>
            </option>
          </optgroup>
        </select>
        
        <!-- Loading spinner -->
        <div 
          v-if="modelsStore.isLoading" 
          class="absolute right-2 top-1/2 transform -translate-y-1/2"
        >
          <div class="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
        </div>
      </div>

      <!-- Current model info -->
      <div v-if="modelsStore.currentModel && !modelsStore.isLoading" class="text-xs text-gray-500 dark:text-gray-400">
        Current: {{ modelsStore.currentModel.name }}
      </div>
      
      <!-- Error message -->
      <div v-if="modelsStore.error" class="text-xs text-red-500">
        {{ modelsStore.error }}
      </div>
    </div>

    <!-- Model details (optional) -->
    <div v-if="modelsStore.selectedModel && showDetails" class="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
      <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {{ modelsStore.selectedModel.name }}
      </h4>
      
      <div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <div v-if="modelsStore.selectedModel.description">
          {{ modelsStore.selectedModel.description }}
        </div>
        
        <div v-if="modelsStore.selectedModel.context_length" class="flex items-center gap-2">
          <span class="font-medium">Context Length:</span>
          <span>{{ formatContextLength(modelsStore.selectedModel.context_length) }}</span>
        </div>
        
        <div v-if="modelsStore.selectedModel.pricing" class="flex items-center gap-4">
          <span class="font-medium">Pricing:</span>
          <span>Input: {{ modelsStore.selectedModel.pricing.prompt }}</span>
          <span>Output: {{ modelsStore.selectedModel.pricing.completion }}</span>
        </div>
        
        <div v-if="modelsStore.selectedModel.architecture" class="flex items-center gap-2">
          <span class="font-medium">Modalities:</span>
          <span>{{ modelsStore.selectedModel.architecture.input_modalities.join(', ') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useModelsStore } from '../stores/models'
import type { ModelDto } from '../types/api'

interface Props {
  modelValue?: string | null
  showDetails?: boolean
  autoSelect?: boolean
}

interface Emits {
  (event: 'update:modelValue', value: string | null): void
  (event: 'model-selected', model: ModelDto | null): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  showDetails: false,
  autoSelect: true
})

const emit = defineEmits<Emits>()

const modelsStore = useModelsStore()

const selectedModelId = ref<string | null>(props.modelValue)

// Group models by category
const getModelsByCategory = (category: string): ModelDto[] => {
  return modelsStore.availableModels.filter(model => {
    const modelCategory = extractCategoryFromModel(model)
    return modelCategory === category
  })
}

// Extract category helper (same as in store)
function extractCategoryFromModel(model: ModelDto): string {
  const id = model.id.toLowerCase()
  
  if (id.includes('gpt')) return 'OpenAI'
  if (id.includes('claude')) return 'Anthropic'
  if (id.includes('gemini')) return 'Google'
  if (id.includes('llama')) return 'Meta'
  if (id.includes('mistral')) return 'Mistral'
  if (id.includes('cohere')) return 'Cohere'
  
  const parts = id.split('-')
  if (parts.length > 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
  }
  
  return 'Other'
}

// Format context length for display
function formatContextLength(length: number): string {
  if (length >= 1000000) {
    return `${(length / 1000000).toFixed(1)}M tokens`
  } else if (length >= 1000) {
    return `${(length / 1000).toFixed(0)}K tokens`
  }
  return `${length} tokens`
}

// Handle model selection
async function handleModelChange() {
  if (!selectedModelId.value) return
  
  // Store the selected model ID to prevent override
  const userSelectedModelId = selectedModelId.value
  
  // Mark that user has made a selection and that we're in the process of selecting
  userHasSelected.value = true
  isSelectingModel.value = true
  
  try {
    await modelsStore.selectModel(userSelectedModelId)
    
    // Ensure the selection is preserved after the store operation
    selectedModelId.value = userSelectedModelId
    
    const model = modelsStore.getModelById(userSelectedModelId)
    
    emit('update:modelValue', userSelectedModelId)
    emit('model-selected', model || null)
    
  } catch (err) {
    console.error('Failed to select model:', err)
    // Reset selection on error
    selectedModelId.value = props.modelValue
    userHasSelected.value = false
  } finally {
    isSelectingModel.value = false
  }
}

// Watch for external model value changes
watch(() => props.modelValue, (newValue) => {
  selectedModelId.value = newValue
  modelsStore.setSelectedModelId(newValue)
  // If value is set externally, mark as user selected to prevent auto-override
  if (newValue) {
    userHasSelected.value = true
  }
})

// Watch for current model changes to auto-select (only when no user selection has been made)
const userHasSelected = ref(false)
const isSelectingModel = ref(false)

watch(() => modelsStore.currentModel, (newCurrentModel) => {
  // Only auto-select if user hasn't made any manual selection and we're not in the middle of selecting
  if (props.autoSelect && 
      newCurrentModel && 
      !userHasSelected.value && 
      !selectedModelId.value &&
      !isSelectingModel.value) {
    selectedModelId.value = newCurrentModel.model_id
    emit('update:modelValue', newCurrentModel.model_id)
  }
})

// Initialize on mount
onMounted(async () => {
  try {
    await modelsStore.initialize()
    
    // Auto-select current model if no model is selected and no user selection has been made
    if (props.autoSelect && modelsStore.currentModel && !selectedModelId.value && !userHasSelected.value) {
      selectedModelId.value = modelsStore.currentModel.model_id
      emit('update:modelValue', modelsStore.currentModel.model_id)
    }
  } catch (error) {
    console.warn('Failed to initialize models store:', error)
    // Don't block the component from rendering
  }
})
</script>

<style scoped>
.model-selector {
  @apply w-full;
}

/* Custom styling for select arrow */
select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

/* Dark mode select arrow */
.dark select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%9ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
}
</style>