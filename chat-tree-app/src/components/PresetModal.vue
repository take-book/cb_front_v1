<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto m-4">
      <div class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-900">
            {{ preset ? 'Edit Preset' : 'Create Preset' }}
          </h2>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter preset name"
            >
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              v-model="form.description"
              rows="2"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this preset is for"
            ></textarea>
          </div>

          <!-- Model ID -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Model *
            </label>
            <select
              v-model="form.model_id"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a model</option>
              <option v-for="model in availableModels" :key="model.id" :value="model.id">
                {{ model.name }}
              </option>
            </select>
          </div>

          <!-- Temperature -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Temperature: {{ form.temperature }}
            </label>
            <input
              v-model.number="form.temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            >
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>Focused (0)</span>
              <span>Balanced (1)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          <!-- Max Tokens -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Max Tokens
            </label>
            <input
              v-model.number="form.max_tokens"
              type="number"
              min="1"
              max="4000"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1000"
            >
          </div>

          <!-- System Prompt -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              v-model="form.system_prompt"
              rows="4"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter system instructions for the AI..."
            ></textarea>
          </div>

          <!-- Settings -->
          <div class="space-y-3">
            <label v-if="preset" class="flex items-center">
              <input
                v-model="form.is_favorite"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-700">Mark as favorite</span>
            </label>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!form.name || !form.model_id"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ preset ? 'Update' : 'Create' }} Preset
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { PresetResponse } from '../types/api'
import { useModelsStore } from '../stores/models'

interface Props {
  preset?: PresetResponse | null
}

interface Emits {
  (e: 'save', data: any): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const modelsStore = useModelsStore()

// Form data
const form = ref({
  name: '',
  description: '',
  model_id: '',
  temperature: 0.7,
  max_tokens: 1000,
  system_prompt: '',
  is_favorite: false
})

// Computed
const { models: availableModels } = modelsStore

// Methods
const handleSubmit = () => {
  const data = {
    name: form.value.name,
    description: form.value.description || null,
    model_id: form.value.model_id,
    temperature: form.value.temperature,
    max_tokens: form.value.max_tokens,
    system_prompt: form.value.system_prompt || null,
    ...(props.preset ? { is_favorite: form.value.is_favorite } : {})
  }
  
  emit('save', data)
}

// Initialize form with preset data if editing
onMounted(async () => {
  await modelsStore.fetchModels()
  
  if (props.preset) {
    form.value = {
      name: props.preset.name,
      description: props.preset.description || '',
      model_id: props.preset.model_id,
      temperature: props.preset.temperature,
      max_tokens: props.preset.max_tokens,
      system_prompt: props.preset.system_prompt || '',
      is_favorite: props.preset.is_favorite
    }
  }
})

// Update form when preset prop changes
watch(() => props.preset, (newPreset) => {
  if (newPreset) {
    form.value = {
      name: newPreset.name,
      description: newPreset.description || '',
      model_id: newPreset.model_id,
      temperature: newPreset.temperature,
      max_tokens: newPreset.max_tokens,
      system_prompt: newPreset.system_prompt || '',
      is_favorite: newPreset.is_favorite
    }
  } else {
    // Reset form for new preset
    form.value = {
      name: '',
      description: '',
      model_id: '',
      temperature: 0.7,
      max_tokens: 1000,
      system_prompt: '',
      is_favorite: false
    }
  }
})
</script>