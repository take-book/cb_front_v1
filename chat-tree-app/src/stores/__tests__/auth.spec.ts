import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import axios from 'axios'
import { authApi } from '@/api/client'

vi.mock('axios')
vi.mock('@/api/client', () => ({
  default: {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  },
  authApi: {
    login: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn()
  }
}))

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const authStore = useAuthStore()
      
      expect(authStore.user).toBeNull()
      expect(authStore.accessToken).toBeNull()
      expect(authStore.refreshToken).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('Login', () => {
    it('should login successfully and store tokens', async () => {
      const authStore = useAuthStore()
      const mockLoginResponse = {
        data: {
          access_token: 'test-access-token',
          token_type: 'Bearer',
          refresh_token: 'test-refresh-token'
        }
      }
      const mockUserResponse = {
        data: {
          uuid: 'test-uuid',
          username: 'testuser',
          created_at: '2024-01-01T00:00:00Z'
        }
      }

      vi.mocked(authApi.login).mockResolvedValueOnce(mockLoginResponse.data)
      vi.mocked(authApi.me).mockResolvedValueOnce(mockUserResponse.data)

      await authStore.login('testuser', 'password123')

      expect(authStore.accessToken).toBe('test-access-token')
      expect(authStore.refreshToken).toBe('test-refresh-token')
      expect(authStore.user).toEqual(mockUserResponse.data)
      expect(authStore.isAuthenticated).toBe(true)
      
      // Check localStorage
      expect(localStorage.getItem('access_token')).toBe('test-access-token')
      expect(localStorage.getItem('refresh_token')).toBe('test-refresh-token')
    })

    it('should handle login error', async () => {
      const authStore = useAuthStore()
      const error = new Error('Invalid credentials')
      vi.mocked(axios.post).mockRejectedValueOnce(error)

      await expect(authStore.login('testuser', 'wrongpassword')).rejects.toThrow('Invalid credentials')
      
      expect(authStore.accessToken).toBeNull()
      expect(authStore.refreshToken).toBeNull()
      expect(authStore.user).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('Logout', () => {
    it('should clear auth state on logout', async () => {
      const authStore = useAuthStore()
      
      // Set initial auth state
      authStore.accessToken = 'test-token'
      authStore.refreshToken = 'test-refresh'
      authStore.user = { uuid: 'test', username: 'user' }
      localStorage.setItem('access_token', 'test-token')
      localStorage.setItem('refresh_token', 'test-refresh')

      authStore.logout()

      expect(authStore.accessToken).toBeNull()
      expect(authStore.refreshToken).toBeNull()
      expect(authStore.user).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
    })
  })

  describe('Token Refresh', () => {
    it('should refresh token successfully', async () => {
      const authStore = useAuthStore()
      authStore.refreshToken = 'old-refresh-token'
      
      const mockResponse = {
        data: {
          access_token: 'new-access-token',
          token_type: 'Bearer'
        }
      }

      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      await authStore.refreshAccessToken()

      expect(authStore.accessToken).toBe('new-access-token')
      expect(localStorage.getItem('access_token')).toBe('new-access-token')
    })

    it('should logout if refresh fails', async () => {
      const authStore = useAuthStore()
      authStore.refreshToken = 'old-refresh-token'
      authStore.accessToken = 'old-access-token'
      
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Refresh failed'))

      await authStore.refreshAccessToken()

      expect(authStore.accessToken).toBeNull()
      expect(authStore.refreshToken).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('Register', () => {
    it('should register a new user successfully', async () => {
      const authStore = useAuthStore()
      const mockResponse = {
        data: {
          uuid: 'new-user-uuid',
          username: 'newuser',
          created_at: '2024-01-01T00:00:00Z'
        }
      }

      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      const result = await authStore.register('newuser', 'password123')

      expect(result).toEqual(mockResponse.data)
      expect(axios.post).toHaveBeenCalledWith('/api/v1/users', {
        username: 'newuser',
        password: 'password123'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: false
      })
    })
  })

  describe('Initialize from Storage', () => {
    it('should load tokens from localStorage on init', async () => {
      localStorage.setItem('access_token', 'stored-access-token')
      localStorage.setItem('refresh_token', 'stored-refresh-token')
      
      const mockUserResponse = {
        data: {
          uuid: 'test-uuid',
          username: 'testuser',
          created_at: '2024-01-01T00:00:00Z'
        }
      }

      vi.mocked(axios.get).mockResolvedValueOnce(mockUserResponse)

      const authStore = useAuthStore()
      await authStore.initializeFromStorage()

      expect(authStore.accessToken).toBe('stored-access-token')
      expect(authStore.refreshToken).toBe('stored-refresh-token')
      expect(authStore.user).toEqual(mockUserResponse.data)
      expect(authStore.isAuthenticated).toBe(true)
    })

    it('should not fetch user if no token in storage', async () => {
      const authStore = useAuthStore()
      await authStore.initializeFromStorage()

      expect(authStore.accessToken).toBeNull()
      expect(authStore.user).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
      expect(axios.get).not.toHaveBeenCalled()
    })
  })
})