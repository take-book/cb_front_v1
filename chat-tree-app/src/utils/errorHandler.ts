import type { AxiosError } from 'axios'

export interface ApiError {
  message: string
  status?: number
  detail?: string
}

export function handleApiError(error: unknown): ApiError {
  // Network or CORS error
  if (error instanceof Error && error.message === 'Network Error') {
    return {
      message: 'Cannot connect to server. Please check if the API server is running on http://localhost:8000',
      detail: 'Network Error - CORS or connection issue'
    }
  }

  // Axios error
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<any>
    
    // Handle different status codes
    switch (axiosError.response?.status) {
      case 400:
        return {
          message: axiosError.response?.data?.detail || 'Invalid request. Please check your input.',
          status: 400,
          detail: 'Bad Request'
        }
      case 401:
        return {
          message: 'Invalid username or password.',
          status: 401,
          detail: 'Unauthorized'
        }
      case 403:
        return {
          message: 'Access forbidden.',
          status: 403,
          detail: 'Forbidden'
        }
      case 404:
        return {
          message: 'Service not found. Please check the API server.',
          status: 404,
          detail: 'Not Found'
        }
      case 422:
        return {
          message: axiosError.response?.data?.detail || 'Invalid data provided.',
          status: 422,
          detail: 'Validation Error'
        }
      case 500:
        return {
          message: 'Server error. Please try again later.',
          status: 500,
          detail: 'Internal Server Error'
        }
      default:
        return {
          message: axiosError.response?.data?.detail || axiosError.message || 'An error occurred',
          status: axiosError.response?.status,
          detail: axiosError.response?.statusText
        }
    }
  }

  // Generic error
  if (error instanceof Error) {
    return {
      message: error.message,
      detail: 'Unknown Error'
    }
  }

  return {
    message: 'An unexpected error occurred',
    detail: 'Unknown Error'
  }
}

function isAxiosError(error: unknown): error is AxiosError {
  return (error as AxiosError).isAxiosError === true
}