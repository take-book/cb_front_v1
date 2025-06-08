import axios, { type AxiosInstance } from 'axios'
import { ErrorHandler, logError } from '../utils/errorHandler'
import { ERROR_CODES } from '../types/errors'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Callback for handling auth failures (to be set by the app)
let onAuthFailure: (() => void) | null = null

export const setAuthFailureCallback = (callback: () => void) => {
  onAuthFailure = callback
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Important for CORS
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Get auth token from localStorage directly to avoid circular dependency
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    
    // Enhanced logging for debugging
    if (import.meta.env.DEV) {
      console.log('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        hasAuth: !!accessToken,
        headers: config.headers
      })
    }
    
    return config
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('API Request Error:', error)
    }
    return Promise.reject(error)
  }
)

// Response interceptor with standardized error handling
apiClient.interceptors.response.use(
  (response) => {
    // Enhanced response logging for debugging
    if (import.meta.env.DEV) {
      console.log('API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      })
    }
    return response
  },
  async (error) => {
    if (import.meta.env.DEV) {
      console.error('API Response Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: error.response?.data,
        error: error.message
      })
    }
    const originalRequest = error.config

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Try refresh token
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post('/api/v1/auth/refresh', null, {
            baseURL: API_BASE_URL,
            headers: {
              'Authorization': `Bearer ${refreshToken}`
            }
          })
          
          const newAccessToken = response.data.access_token
          localStorage.setItem('access_token', newAccessToken)
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh failed, clear storage and notify app
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          
          const normalizedError = ErrorHandler.normalize(refreshError)
          logError(normalizedError, 'Token refresh failed')
          
          if (onAuthFailure) {
            onAuthFailure()
          } else {
            window.location.href = '/login'
          }
          return Promise.reject(normalizedError)
        }
      } else {
        // No refresh token, notify app
        localStorage.removeItem('access_token')
        const authError = ErrorHandler.normalize({
          message: 'Authentication required',
          code: ERROR_CODES.UNAUTHORIZED,
          statusCode: 401
        })
        
        logError(authError, 'No refresh token available')
        
        if (onAuthFailure) {
          onAuthFailure()
        } else {
          window.location.href = '/login'
        }
        return Promise.reject(authError)
      }
    }

    // Normalize and log all other errors
    const normalizedError = ErrorHandler.normalize(error)
    logError(normalizedError, `API ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`)

    return Promise.reject(normalizedError)
  }
)

// Health check function
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await axios.get('/api/v1/health', {
      baseURL: API_BASE_URL,
      timeout: 5000
    })
    return response.status === 200
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Health check failed:', error)
    }
    return false
  }
}

// Also set up the default axios instance for auth module
axios.defaults.baseURL = API_BASE_URL

// Log API base URL for debugging in development only
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL)
}

// Auth API
export const authApi = {
  async login(username: string, password: string) {
    const response = await axios.post('/api/v1/auth/login', 
      new URLSearchParams({
        username,
        password,
        grant_type: 'password'
      }),
      {
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    return response.data
  },

  async refresh() {
    const response = await apiClient.post('/api/v1/auth/refresh')
    return response.data
  },

  async me() {
    const response = await apiClient.get('/api/v1/auth/me')
    return response.data
  }
}

export default apiClient