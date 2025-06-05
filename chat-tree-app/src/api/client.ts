import axios, { type AxiosInstance } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

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
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

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
          // Refresh failed, clear storage and redirect
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem('access_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
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
    console.error('Health check failed:', error)
    return false
  }
}

// Also set up the default axios instance for auth module
axios.defaults.baseURL = API_BASE_URL

// Log API base URL for debugging
console.log('API Base URL:', API_BASE_URL)

export default apiClient