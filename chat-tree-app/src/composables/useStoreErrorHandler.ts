import { ref } from 'vue'
import { ErrorHandler, logError } from '../utils/errorHandler'
import { useToast } from './useToast'
import type { AppError } from '../types/errors'

const { showToast } = useToast()

export interface StoreErrorOptions {
  showToast?: boolean
  logError?: boolean
  context?: string
}

export function useStoreErrorHandler() {
  const error = ref<AppError | null>(null)

  const handleError = (
    err: any, 
    action: string, 
    options: StoreErrorOptions = {}
  ): AppError => {
    const {
      showToast: shouldShowToast = true,
      logError: shouldLog = true,
      context
    } = options

    // Normalize the error
    const normalizedError = ErrorHandler.normalize(err)
    
    // Set store error state
    error.value = normalizedError

    // Log error if requested
    if (shouldLog) {
      logError(normalizedError, context || action)
    }

    // Show toast notification if requested
    if (shouldShowToast) {
      const userMessage = ErrorHandler.getUserMessage(normalizedError)
      showToast(userMessage, 'error')
    }

    return normalizedError
  }

  const clearError = () => {
    error.value = null
  }

  const hasError = () => {
    return error.value !== null
  }

  const isNetworkError = () => {
    return error.value ? ErrorHandler.isNetworkError(error.value) : false
  }

  const isAuthError = () => {
    return error.value ? ErrorHandler.isAuthError(error.value) : false
  }

  const isValidationError = () => {
    return error.value ? ErrorHandler.isValidationError(error.value) : false
  }

  const getErrorMessage = () => {
    return error.value ? ErrorHandler.getUserMessage(error.value) : null
  }

  const handleAsyncOperation = async <T>(
    operation: () => Promise<T>,
    action: string,
    options: StoreErrorOptions = {}
  ): Promise<T | null> => {
    try {
      clearError()
      const result = await operation()
      return result
    } catch (err) {
      handleError(err, action, options)
      return null
    }
  }

  return {
    error,
    handleError,
    clearError,
    hasError,
    isNetworkError,
    isAuthError,
    isValidationError,
    getErrorMessage,
    handleAsyncOperation
  }
}

export type StoreErrorHandler = ReturnType<typeof useStoreErrorHandler>