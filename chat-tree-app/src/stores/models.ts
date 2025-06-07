import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { modelsApi } from '../api/chats'
import type { ModelDto, ModelListResponse, CurrentModelResponse } from '../types/api'

export const useModelsStore = defineStore('models', () => {
  // State
  const availableModels = ref<ModelDto[]>([])
  const currentModel = ref<CurrentModelResponse | null>(null)
  const selectedModelId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed getters
  const isModelSelected = computed((): boolean => {
    return selectedModelId.value !== null
  })

  const getModelById = computed(() => {
    return (modelId: string): ModelDto | undefined => {
      return availableModels.value.find(model => model.id === modelId)
    }
  })

  const selectedModel = computed((): ModelDto | null => {
    if (!selectedModelId.value) return null
    return getModelById.value(selectedModelId.value) || null
  })

  const modelCategories = computed((): string[] => {
    const categories = new Set<string>()
    availableModels.value.forEach(model => {
      if (model.description) {
        // Try to extract category from description or model id
        const category = extractCategoryFromModel(model)
        if (category) categories.add(category)
      }
    })
    return Array.from(categories).sort()
  })

  // Actions
  async function fetchAvailableModels(category?: string) {
    isLoading.value = true
    error.value = null

    try {
      const response: ModelListResponse = await modelsApi.getModels(category)
      availableModels.value = response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch models'
      if (import.meta.env.DEV) {
        console.error('Failed to fetch models:', err)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchCurrentModel() {
    isLoading.value = true
    error.value = null

    try {
      const response: CurrentModelResponse = await modelsApi.getCurrentModel()
      currentModel.value = response
      selectedModelId.value = response.model_id
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch current model'
      if (import.meta.env.DEV) {
        console.error('Failed to fetch current model:', err)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function selectModel(modelId: string) {
    isLoading.value = true
    error.value = null

    try {
      await modelsApi.selectModel(modelId)
      selectedModelId.value = modelId
      
      // Update current model to reflect the selection
      const selectedModel = getModelById.value(modelId)
      if (selectedModel) {
        currentModel.value = {
          model_id: modelId,
          name: selectedModel.name
        }
      }
      
      if (import.meta.env.DEV) {
        console.log('Model selected successfully:', modelId)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to select model'
      if (import.meta.env.DEV) {
        console.error('Failed to select model:', err)
      }
    } finally {
      isLoading.value = false
    }
  }

  function setSelectedModelId(modelId: string | null) {
    selectedModelId.value = modelId
  }

  function clearSelection() {
    selectedModelId.value = null
  }

  // Helper function to extract category from model
  function extractCategoryFromModel(model: ModelDto): string | null {
    const id = model.id.toLowerCase()
    
    // Common model categories
    if (id.includes('gpt')) return 'OpenAI'
    if (id.includes('claude')) return 'Anthropic'
    if (id.includes('gemini')) return 'Google'
    if (id.includes('llama')) return 'Meta'
    if (id.includes('mistral')) return 'Mistral'
    if (id.includes('cohere')) return 'Cohere'
    
    // Fallback to first part of model ID
    const parts = id.split('-')
    if (parts.length > 1) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    }
    
    return 'Other'
  }

  // Reset store
  function reset() {
    availableModels.value = []
    currentModel.value = null
    selectedModelId.value = null
    isLoading.value = false
    error.value = null
  }

  // Initialize store
  async function initialize() {
    await Promise.all([
      fetchAvailableModels(),
      fetchCurrentModel()
    ])
  }

  return {
    // State
    availableModels,
    currentModel,
    selectedModelId,
    isLoading,
    error,

    // Computed
    isModelSelected,
    getModelById,
    selectedModel,
    modelCategories,

    // Actions
    fetchAvailableModels,
    fetchCurrentModel,
    selectModel,
    setSelectedModelId,
    clearSelection,
    reset,
    initialize,

    // Aliases for compatibility
    models: availableModels,
    fetchModels: fetchAvailableModels
  }
})