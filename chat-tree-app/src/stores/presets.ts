import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { presetsApi } from '../api/presets'
import type {
  PresetResponse,
  PresetCreateRequest,
  PresetUpdateRequest,
  PresetListParams
} from '../types/api'
import { useToast } from '../composables/useToast'

export const usePresetsStore = defineStore('presets', () => {
  const { showToast } = useToast()
  
  // State
  const presets = ref<PresetResponse[]>([])
  const currentPreset = ref<PresetResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Pagination state
  const totalPresets = ref(0)
  const currentPage = ref(1)
  const limit = ref(20)
  const totalPages = ref(0)

  // Getters
  const favoritePresets = computed(() => 
    presets.value.filter(preset => preset.is_favorite)
  )

  const presetsByModel = computed(() => {
    const grouped = presets.value.reduce((acc, preset) => {
      const modelId = preset.model_id
      if (!acc[modelId]) {
        acc[modelId] = []
      }
      acc[modelId].push(preset)
      return acc
    }, {} as Record<string, PresetResponse[]>)
    return grouped
  })

  // Actions
  const fetchPresets = async (params?: PresetListParams) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await presetsApi.getPresets({
        page: currentPage.value,
        limit: limit.value,
        ...params
      })
      
      presets.value = response.items as PresetResponse[]
      totalPresets.value = response.total
      totalPages.value = response.pages
      currentPage.value = response.page
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch presets'
      showToast('Failed to fetch presets', 'error')
    } finally {
      loading.value = false
    }
  }

  const fetchPreset = async (presetUuid: string) => {
    loading.value = true
    error.value = null
    
    try {
      const preset = await presetsApi.getPreset(presetUuid)
      currentPreset.value = preset
      return preset
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch preset'
      showToast('Failed to fetch preset', 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createPreset = async (request: PresetCreateRequest) => {
    loading.value = true
    error.value = null
    
    try {
      const preset = await presetsApi.createPreset(request)
      presets.value.unshift(preset)
      totalPresets.value += 1
      showToast('Preset created successfully', 'success')
      return preset
    } catch (err: any) {
      error.value = err.message || 'Failed to create preset'
      showToast('Failed to create preset', 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePreset = async (presetUuid: string, request: PresetUpdateRequest) => {
    loading.value = true
    error.value = null
    
    try {
      const updatedPreset = await presetsApi.updatePreset(presetUuid, request)
      
      const index = presets.value.findIndex(p => p.uuid === presetUuid)
      if (index !== -1) {
        presets.value[index] = updatedPreset
      }
      
      if (currentPreset.value?.uuid === presetUuid) {
        currentPreset.value = updatedPreset
      }
      
      showToast('Preset updated successfully', 'success')
      return updatedPreset
    } catch (err: any) {
      error.value = err.message || 'Failed to update preset'
      showToast('Failed to update preset', 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePreset = async (presetUuid: string) => {
    loading.value = true
    error.value = null
    
    try {
      await presetsApi.deletePreset(presetUuid)
      
      presets.value = presets.value.filter(p => p.uuid !== presetUuid)
      totalPresets.value -= 1
      
      if (currentPreset.value?.uuid === presetUuid) {
        currentPreset.value = null
      }
      
      showToast('Preset deleted successfully', 'success')
    } catch (err: any) {
      error.value = err.message || 'Failed to delete preset'
      showToast('Failed to delete preset', 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  const usePreset = async (presetUuid: string) => {
    try {
      await presetsApi.usePreset(presetUuid)
      
      const preset = presets.value.find(p => p.uuid === presetUuid)
      if (preset) {
        preset.usage_count += 1
      }
      
      if (currentPreset.value?.uuid === presetUuid) {
        currentPreset.value.usage_count += 1
      }
    } catch (err: any) {
      showToast('Failed to record preset usage', 'error')
      throw err
    }
  }

  const toggleFavorite = async (presetUuid: string) => {
    const preset = presets.value.find(p => p.uuid === presetUuid)
    if (!preset) return
    
    try {
      await updatePreset(presetUuid, {
        is_favorite: !preset.is_favorite
      })
    } catch (err) {
      // Error handling is done in updatePreset
    }
  }

  const searchPresets = async (query: string) => {
    await fetchPresets({
      q: query,
      page: 1
    })
  }

  const setPage = async (page: number) => {
    currentPage.value = page
    await fetchPresets()
  }

  const clearError = () => {
    error.value = null
  }

  const clearCurrentPreset = () => {
    currentPreset.value = null
  }

  return {
    // State
    presets,
    currentPreset,
    loading,
    error,
    totalPresets,
    currentPage,
    limit,
    totalPages,
    
    // Getters
    favoritePresets,
    presetsByModel,
    
    // Actions
    fetchPresets,
    fetchPreset,
    createPreset,
    updatePreset,
    deletePreset,
    usePreset,
    toggleFavorite,
    searchPresets,
    setPage,
    clearError,
    clearCurrentPreset
  }
})