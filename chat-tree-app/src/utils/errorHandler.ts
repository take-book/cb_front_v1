import { AppError, ERROR_CODES } from '../types/errors'
import type { AxiosError } from 'axios'

// Enhanced error handler utility
export class ErrorHandler {
  
  /**
   * Convert various error types to standardized AppError
   */
  static normalize(error: any): AppError {
    if (error instanceof AppError) {
      return error
    }

    // Handle Axios errors
    if (error.isAxiosError || error.response || error.request) {
      return this.handleAxiosError(error as AxiosError)
    }

    // Handle native Error objects
    if (error instanceof Error) {
      return new AppError(
        error.message,
        ERROR_CODES.UNKNOWN_ERROR,
        undefined,
        { originalError: error.name }
      )
    }

    // Handle string errors
    if (typeof error === 'string') {
      return new AppError(error, ERROR_CODES.UNKNOWN_ERROR)
    }

    // Handle objects with message property
    if (error && typeof error === 'object' && error.message) {
      return new AppError(
        error.message,
        error.code || ERROR_CODES.UNKNOWN_ERROR,
        error.statusCode,
        error.details
      )
    }

    // Fallback for unknown error types
    return new AppError(
      'An unexpected error occurred',
      ERROR_CODES.UNKNOWN_ERROR,
      undefined,
      { originalError: error }
    )
  }

  /**
   * Handle Axios-specific errors with enhanced categorization
   */
  static handleAxiosError(error: AxiosError): AppError {
    if (error.response) {
      const { status, data } = error.response
      const message = (data as any)?.message || error.message || 'An API error occurred'
      const code = (data as any)?.code || this.getErrorCodeFromStatus(status)
      
      return new AppError(
        message,
        code,
        status,
        {
          url: error.config?.url,
          method: error.config?.method,
          data: data
        }
      )
    } else if (error.request) {
      // Network error
      return new AppError(
        'Network error - please check your connection',
        ERROR_CODES.NETWORK_ERROR,
        undefined,
        {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.code === 'ECONNABORTED'
        }
      )
    } else {
      // Request setup error
      return new AppError(
        error.message || 'Request configuration error',
        ERROR_CODES.UNKNOWN_ERROR,
        undefined,
        { config: error.config }
      )
    }
  }

  /**
   * Map HTTP status codes to error codes
   */
  static getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return ERROR_CODES.INVALID_INPUT
      case 401:
        return ERROR_CODES.UNAUTHORIZED
      case 403:
        return ERROR_CODES.FORBIDDEN
      case 404:
        return ERROR_CODES.NOT_FOUND
      case 422:
        return ERROR_CODES.VALIDATION_ERROR
      case 500:
        return ERROR_CODES.INTERNAL_SERVER_ERROR
      case 503:
        return ERROR_CODES.SERVICE_UNAVAILABLE
      default:
        return `HTTP_${status}`
    }
  }

  /**
   * Check if error is a network-related error
   */
  static isNetworkError(error: AppError): boolean {
    return [
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.TIMEOUT_ERROR,
      ERROR_CODES.SERVICE_UNAVAILABLE
    ].includes(error.code as any)
  }

  /**
   * Check if error is authentication-related
   */
  static isAuthError(error: AppError): boolean {
    return [
      ERROR_CODES.UNAUTHORIZED,
      ERROR_CODES.TOKEN_EXPIRED,
      ERROR_CODES.INVALID_CREDENTIALS
    ].includes(error.code as any)
  }

  /**
   * Check if error is validation-related
   */
  static isValidationError(error: AppError): boolean {
    return [
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_CODES.INVALID_INPUT,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    ].includes(error.code as any)
  }

  /**
   * Check if error indicates a missing resource
   */
  static isNotFoundError(error: AppError): boolean {
    return [
      ERROR_CODES.NOT_FOUND,
      ERROR_CODES.RESOURCE_NOT_FOUND,
      ERROR_CODES.CHAT_NOT_FOUND,
      ERROR_CODES.MESSAGE_NOT_FOUND
    ].includes(error.code as any)
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: AppError): string {
    if (this.isNetworkError(error)) {
      return 'Unable to connect to the server. Please check your internet connection and try again.'
    }

    if (this.isAuthError(error)) {
      return 'Your session has expired. Please log in again.'
    }

    if (this.isValidationError(error)) {
      return error.message || 'Please check your input and try again.'
    }

    if (this.isNotFoundError(error)) {
      return 'The requested resource could not be found.'
    }

    if (error.statusCode && error.statusCode >= 500) {
      return 'A server error occurred. Please try again later.'
    }

    // Return original message for other errors
    return error.message || 'An unexpected error occurred.'
  }

  /**
   * Log error for debugging (development only)
   */
  static log(error: AppError, context?: string): void {
    if (import.meta.env.DEV) {
      const logData = {
        context,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
        stack: error.stack
      }
      
      if (error.statusCode && error.statusCode >= 500) {
        console.error('AppError (Server):', logData)
      } else if (this.isAuthError(error)) {
        console.warn('AppError (Auth):', logData)
      } else {
        console.info('AppError:', logData)
      }
    }
  }

  /**
   * Create error from validation failure
   */
  static createValidationError(field: string, value: any, message?: string): AppError {
    return new AppError(
      message || `Invalid value for field "${field}"`,
      ERROR_CODES.VALIDATION_ERROR,
      400,
      { field, value }
    )
  }

  /**
   * Create error for missing required field
   */
  static createRequiredFieldError(field: string): AppError {
    return new AppError(
      `Required field "${field}" is missing`,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      400,
      { field }
    )
  }
}

// Convenience function for quick error normalization
export const normalizeError = (error: any): AppError => {
  return ErrorHandler.normalize(error)
}

// Convenience function for getting user-friendly messages
export const getUserErrorMessage = (error: any): string => {
  const normalizedError = ErrorHandler.normalize(error)
  return ErrorHandler.getUserMessage(normalizedError)
}

// Convenience function for logging errors
export const logError = (error: any, context?: string): void => {
  const normalizedError = ErrorHandler.normalize(error)
  ErrorHandler.log(normalizedError, context)
}