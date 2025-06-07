import { defineStore } from 'pinia'
import axios from 'axios'
import { authApi } from '@/api/client'
import type { LoginResponse, UserInfo, UserRegisterResponse } from '../types/api'
import { normalizeError } from '@/utils/errorHandler'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserInfo | null,
    accessToken: null as string | null,
    refreshToken: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user
  },

  actions: {
    async login(username: string, password: string) {
      try {
        const response = await authApi.login(username, password)

        this.accessToken = response.access_token
        this.refreshToken = response.refresh_token || null
        
        // Store tokens in localStorage
        if (this.accessToken) {
          localStorage.setItem('access_token', this.accessToken)
        }
        if (this.refreshToken) {
          localStorage.setItem('refresh_token', this.refreshToken)
        }

        // Fetch user info
        await this.fetchUserInfo()
      } catch (error) {
        this.logout()
        const apiError = normalizeError(error)
        throw new Error(apiError.message)
      }
    },

    async fetchUserInfo() {
      try {
        const response = await authApi.me()
        this.user = response
      } catch (error) {
        this.logout()
        const apiError = normalizeError(error)
        throw new Error(apiError.message)
      }
    },

    logout() {
      this.user = null
      this.accessToken = null
      this.refreshToken = null
      
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    },

    async refreshAccessToken() {
      if (!this.refreshToken) {
        this.logout()
        return
      }

      try {
        const response = await authApi.refresh()

        this.accessToken = response.access_token
        if (this.accessToken) {
          localStorage.setItem('access_token', this.accessToken)
        }
      } catch (error) {
        this.logout()
      }
    },

    async register(username: string, password: string) {
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

    async initializeFromStorage() {
      const accessToken = localStorage.getItem('access_token')
      const refreshToken = localStorage.getItem('refresh_token')

      if (accessToken) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        
        try {
          await this.fetchUserInfo()
        } catch (error) {
          // Token might be expired, try to refresh
          if (refreshToken) {
            await this.refreshAccessToken()
            if (this.accessToken) {
              await this.fetchUserInfo()
            }
          } else {
            this.logout()
          }
        }
      }
    }
  }
})