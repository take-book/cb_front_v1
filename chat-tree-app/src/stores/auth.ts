import { defineStore } from 'pinia'
import axios from 'axios'
import apiClient from '@/api/client'
import type { LoginResponse, UserInfo, UserRegisterResponse } from '../types/api'
import { handleApiError } from '@/utils/errorHandler'

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
        const formData = new URLSearchParams()
        formData.append('username', username)
        formData.append('password', password)
        formData.append('grant_type', 'password')

        const response = await axios.post<LoginResponse>('/api/v1/auth/login', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          withCredentials: false
        })

        this.accessToken = response.data.access_token
        this.refreshToken = response.data.refresh_token || null
        
        // Store tokens in localStorage
        if (this.accessToken) {
          localStorage.setItem('access_token', this.accessToken)
        }
        if (this.refreshToken) {
          localStorage.setItem('refresh_token', this.refreshToken)
        }

        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`

        // Fetch user info
        await this.fetchUserInfo()
      } catch (error) {
        this.logout()
        const apiError = handleApiError(error)
        throw new Error(apiError.message)
      }
    },

    async fetchUserInfo() {
      try {
        const response = await axios.get<UserInfo>('/api/v1/auth/me', {
          headers: {
            'Accept': 'application/json'
          },
          withCredentials: false
        })
        this.user = response.data
      } catch (error) {
        this.logout()
        const apiError = handleApiError(error)
        throw new Error(apiError.message)
      }
    },

    logout() {
      this.user = null
      this.accessToken = null
      this.refreshToken = null
      
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      
      delete axios.defaults.headers.common['Authorization']
    },

    async refreshAccessToken() {
      if (!this.refreshToken) {
        this.logout()
        return
      }

      try {
        const response = await axios.post<LoginResponse>('/api/v1/auth/refresh', null, {
          headers: {
            'Authorization': `Bearer ${this.refreshToken}`,
            'Accept': 'application/json'
          },
          withCredentials: false
        })

        this.accessToken = response.data.access_token
        if (this.accessToken) {
          localStorage.setItem('access_token', this.accessToken)
        }
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`
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