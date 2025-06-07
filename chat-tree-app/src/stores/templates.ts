import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { templatesApi } from '../api/templates'
import type {
  TemplateResponse,
  TemplateCreateRequest,
  TemplateUpdateRequest,
  TemplateListParams
} from '../types/api'
import { useToast } from '../composables/useToast'

export const useTemplatesStore = defineStore('templates', () => {
  const { showToast } = useToast()
  
  // State
  const templates = ref<TemplateResponse[]>([])
  const currentTemplate = ref<TemplateResponse | null>(null)
  const categories = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Pagination state
  const totalTemplates = ref(0)
  const currentPage = ref(1)
  const limit = ref(20)
  const totalPages = ref(0)

  // Getters
  const favoriteTemplates = computed(() => 
    templates.value.filter(template => template.is_favorite)
  )

  const publicTemplates = computed(() => 
    templates.value.filter(template => template.is_public)
  )

  const templatesByCategory = computed(() => {
    const grouped = templates.value.reduce((acc, template) => {
      const category = template.category || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(template)
      return acc
    }, {} as Record<string, TemplateResponse[]>)
    return grouped
  })

  // Actions
  const fetchTemplates = async (params?: TemplateListParams) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await templatesApi.getTemplates({
        page: currentPage.value,
        limit: limit.value,
        ...params
      })
      
      templates.value = response.items as TemplateResponse[]
      totalTemplates.value = response.total
      totalPages.value = response.pages
      currentPage.value = response.page
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch templates'
      showToast('Failed to fetch templates', 'error')
    } finally {
      loading.value = false
    }
  }

  const fetchTemplate = async (templateUuid: string) => {
    loading.value = true
    error.value = null
    
    try {
      const template = await templatesApi.getTemplate(templateUuid)
      currentTemplate.value = template
      return template
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch template'
      showToast('Failed to fetch template', 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createTemplate = async (request: TemplateCreateRequest) => {
    loading.value = true
    error.value = null
    
    try {
      const template = await templatesApi.createTemplate(request)
      templates.value.unshift(template)
      totalTemplates.value += 1
      showToast('Template created successfully', 'success')
      return template
    } catch (err: any) {
      error.value = err.message || 'Failed to create template'
      showToast('Failed to create template', 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTemplate = async (templateUuid: string, request: TemplateUpdateRequest) => {
    loading.value = true
    error.value = null
    
    try {
      const updatedTemplate = await templatesApi.updateTemplate(templateUuid, request)
      
      const index = templates.value.findIndex(t => t.uuid === templateUuid)
      if (index !== -1) {
        templates.value[index] = updatedTemplate
      }
      
      if (currentTemplate.value?.uuid === templateUuid) {
        currentTemplate.value = updatedTemplate
      }
      
      showToast('Template updated successfully', 'success')
      return updatedTemplate
    } catch (err: any) {
      error.value = err.message || 'Failed to update template'
      showToast('Failed to update template', 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTemplate = async (templateUuid: string) => {
    loading.value = true
    error.value = null
    
    try {
      await templatesApi.deleteTemplate(templateUuid)
      
      templates.value = templates.value.filter(t => t.uuid !== templateUuid)
      totalTemplates.value -= 1
      
      if (currentTemplate.value?.uuid === templateUuid) {
        currentTemplate.value = null
      }
      
      showToast('Template deleted successfully', 'success')
    } catch (err: any) {
      error.value = err.message || 'Failed to delete template'
      showToast('Failed to delete template', 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  const useTemplate = async (templateUuid: string) => {
    try {
      await templatesApi.useTemplate(templateUuid)
      
      const template = templates.value.find(t => t.uuid === templateUuid)
      if (template) {
        template.usage_count += 1
      }
      
      if (currentTemplate.value?.uuid === templateUuid) {
        currentTemplate.value.usage_count += 1
      }
    } catch (err: any) {
      showToast('Failed to record template usage', 'error')
      throw err
    }
  }

  const fetchCategories = async () => {
    try {
      categories.value = await templatesApi.getTemplateCategories()
    } catch (err: any) {
      showToast('Failed to fetch template categories', 'error')
    }
  }

  const toggleFavorite = async (templateUuid: string) => {
    const template = templates.value.find(t => t.uuid === templateUuid)
    if (!template) return
    
    try {
      await updateTemplate(templateUuid, {
        is_favorite: !template.is_favorite
      })
    } catch (err) {
      // Error handling is done in updateTemplate
    }
  }

  const searchTemplates = async (query: string, category?: string) => {
    await fetchTemplates({
      q: query,
      category: category || null,
      page: 1
    })
  }

  const setPage = async (page: number) => {
    currentPage.value = page
    await fetchTemplates()
  }

  const clearError = () => {
    error.value = null
  }

  const clearCurrentTemplate = () => {
    currentTemplate.value = null
  }

  return {
    // State
    templates,
    currentTemplate,
    categories,
    loading,
    error,
    totalTemplates,
    currentPage,
    limit,
    totalPages,
    
    // Getters
    favoriteTemplates,
    publicTemplates,
    templatesByCategory,
    
    // Actions
    fetchTemplates,
    fetchTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    fetchCategories,
    toggleFavorite,
    searchTemplates,
    setPage,
    clearError,
    clearCurrentTemplate
  }
})