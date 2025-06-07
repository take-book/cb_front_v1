// Standardized error types for the application

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  statusCode?: number
}

export interface ValidationError extends ApiError {
  field: string
  value: any
}

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode?: number
  public readonly details?: Record<string, any>

  constructor(message: string, code: string, statusCode?: number, details?: Record<string, any>) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  static fromAxiosError(error: any): AppError {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      return new AppError(
        data?.message || error.message || 'An API error occurred',
        data?.code || `HTTP_${status}`,
        status,
        data?.details
      )
    } else if (error.request) {
      // Request was made but no response received
      return new AppError(
        'Network error - please check your connection',
        'NETWORK_ERROR',
        undefined,
        { request: error.request }
      )
    } else {
      // Something else happened
      return new AppError(
        error.message || 'An unexpected error occurred',
        'UNKNOWN_ERROR',
        undefined,
        { originalError: error }
      )
    }
  }

  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details
    }
  }
}

export class ValidationAppError extends AppError {
  public readonly field: string
  public readonly value: any

  constructor(message: string, field: string, value: any, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.field = field
    this.value = value
  }
}

// Common error codes
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CHAT_NOT_FOUND: 'CHAT_NOT_FOUND',
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Application specific errors
  CHAT_CREATION_FAILED: 'CHAT_CREATION_FAILED',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
  TREE_LOAD_FAILED: 'TREE_LOAD_FAILED',
  STREAMING_ERROR: 'STREAMING_ERROR',
  
  // WebSocket errors
  WS_CONNECTION_FAILED: 'WS_CONNECTION_FAILED',
  WS_MESSAGE_FAILED: 'WS_MESSAGE_FAILED',
  
  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]