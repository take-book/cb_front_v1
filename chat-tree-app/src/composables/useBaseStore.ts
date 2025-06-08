import { ref, computed } from 'vue'
import { useToast } from './useToast'

const { showToast } = useToast()

export interface BaseStoreState<T> {
  items: T[]
  currentItem: T | null
  loading: boolean
  error: string | null
  totalItems: number
  currentPage: number
  limit: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
}

export function useBaseStore<T extends Record<string, any>>() {
  const items = ref<T[]>([])
  const currentItem = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Pagination state
  const totalItems = ref(0)
  const currentPage = ref(1)
  const limit = ref(20)
  const totalPages = computed(() => 
    Math.ceil(totalItems.value / limit.value)
  )

  const handleError = (err: any, action: string) => {
    const message = err?.response?.data?.detail || err?.message || `Failed to ${action}`
    error.value = message
    showToast(message, 'error')
    console.error(`Store Error [${action}]:`, err)
  }

  const clearError = () => {
    error.value = null
  }

  const startLoading = () => {
    loading.value = true
    clearError()
  }

  const stopLoading = () => {
    loading.value = false
  }

  const setItems = (newItems: T[]) => {
    items.value = newItems
  }

  const setCurrentItem = (item: T | null) => {
    currentItem.value = item
  }

  const setPagination = (total: number, page: number, pageLimit: number) => {
    totalItems.value = total
    currentPage.value = page
    limit.value = pageLimit
  }

  const addItem = (item: T) => {
    items.value.unshift(item)
    totalItems.value += 1
  }

  const updateItem = (updatedItem: T, findBy: keyof T) => {
    const index = items.value.findIndex(item => 
      item && updatedItem && item[findBy] === updatedItem[findBy]
    )
    if (index !== -1) {
      items.value[index] = updatedItem
    }
  }

  const removeItem = (itemToRemove: T, findBy: keyof T) => {
    const index = items.value.findIndex(item => 
      item && itemToRemove && item[findBy] === itemToRemove[findBy]
    )
    if (index !== -1) {
      items.value.splice(index, 1)
      totalItems.value -= 1
    }
  }

  const resetStore = () => {
    items.value = []
    currentItem.value = null
    loading.value = false
    error.value = null
    totalItems.value = 0
    currentPage.value = 1
    limit.value = 20
  }

  return {
    // State
    items,
    currentItem,
    loading,
    error,
    totalItems,
    currentPage,
    limit,
    totalPages,
    
    // Methods
    handleError,
    clearError,
    startLoading,
    stopLoading,
    setItems,
    setCurrentItem,
    setPagination,
    addItem,
    updateItem,
    removeItem,
    resetStore
  }
}

export type BaseStore<T> = ReturnType<typeof useBaseStore<T>>