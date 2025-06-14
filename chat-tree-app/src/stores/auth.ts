import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { authApi } from '@/api/client'
import type { LoginResponse, UserInfo, UserRegisterResponse } from '../types/api'
import { useStoreErrorHandler } from '@/composables/useStoreErrorHandler'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<UserInfo | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const loading = ref(false)

  // Error handling
  const { handleError, clearError, error, handleAsyncOperation } = useStoreErrorHandler()

  // Getters
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  // Token management
  const setTokens = (access: string, refresh?: string) => {
    accessToken.value = access
    refreshToken.value = refresh || null
    
    localStorage.setItem('access_token', access)
    if (refresh) {
      localStorage.setItem('refresh_token', refresh)
    }
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${access}`
  }

  const clearTokens = () => {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    
    delete axios.defaults.headers.common['Authorization']
  }

  // Actions
  const login = async (username: string, password: string) => {
    loading.value = true
    clearError()

    const result = await handleAsyncOperation(
      async () => {
        const response = await authApi.login(username, password)
        
        setTokens(response.access_token, response.refresh_token)
        
        // Fetch user info
        await fetchUserInfo()
        
        return response
      },
      'login'
    )

    loading.value = false

    if (!result) {
      clearTokens()
      throw error.value
    }

    return result
  }

  const fetchUserInfo = async () => {
    const result = await handleAsyncOperation(
      async () => {
        const response = await authApi.me()
        user.value = response
        return response
      },
      'fetch user info',
      { showToast: false } // Don't show toast for internal calls
    )

    if (!result) {
      clearTokens()
      throw error.value
    }

    return result
  }

  const logout = () => {
    clearTokens()
    clearError()
  }

  const refreshAccessToken = async () => {
    if (!refreshToken.value) {
      logout()
      return false
    }

    const result = await handleAsyncOperation(
      async () => {
        const response = await authApi.refresh()
        setTokens(response.access_token, refreshToken.value || undefined)
        return response
      },
      'refresh token',
      { showToast: false, logError: false } // Silent operation
    )

    if (!result) {
      logout()
      return false
    }

    return true
  }

  const register = async (username: string, password: string) => {
    loading.value = true
    clearError()

    const result = await handleAsyncOperation(
      async () => {
        const response = await axios.post<UserRegisterResponse>('/api/v1/users', {
          username,
          password
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: false
        })
        return response.data
      },
      'register'
    )

    loading.value = false

    if (!result) {
      throw error.value
    }

    return result
  }

  const initializeFromStorage = async () => {
    console.log('Auth: initializeFromStorage called')
    const storedAccessToken = localStorage.getItem('access_token')
    const storedRefreshToken = localStorage.getItem('refresh_token')
    console.log('Auth: Found tokens in storage:', { 
      hasAccessToken: !!storedAccessToken, 
      hasRefreshToken: !!storedRefreshToken 
    })

    if (storedAccessToken) {
      accessToken.value = storedAccessToken
      refreshToken.value = storedRefreshToken
      
      console.log('Auth: Setting axios headers...')
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`
      
      try {
        console.log('Auth: Fetching user info...')
        await fetchUserInfo()
        console.log('Auth: User info fetched successfully. User:', user.value)
      } catch (error) {
        console.log('Auth: Failed to fetch user info, token might be expired')
        // Token might be expired, try to refresh
        if (storedRefreshToken) {
          console.log('Auth: Attempting to refresh token...')
          const refreshed = await refreshAccessToken()
          if (refreshed) {
            try {
              console.log('Auth: Retry fetching user info after refresh...')
              await fetchUserInfo()
              console.log('Auth: User info fetched successfully after refresh')
            } catch (error) {
              console.log('Auth: Failed to fetch user info even after refresh, logging out')
              logout()
            }
          }
        } else {
          console.log('Auth: No refresh token available, logging out')
          logout()
        }
      }
    } else {
      console.log('Auth: No access token found in storage')
    }
  }

  return {
    // State
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    
    // Getters
    isAuthenticated,
    
    // Actions
    login,
    logout,
    register,
    fetchUserInfo,
    refreshAccessToken,
    initializeFromStorage,
    clearError
  }
})