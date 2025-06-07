import apiClient from './client'
import type {
  PresetCreateRequest,
  PresetUpdateRequest,
  PresetResponse,
  PresetListParams,
  PaginatedResponse
} from '../types/api'

export const presetsApi = {
  async createPreset(request: PresetCreateRequest): Promise<PresetResponse> {
    const response = await apiClient.post('/api/v1/presets', request)
    return response.data
  },

  async getPresets(params?: PresetListParams): Promise<PaginatedResponse> {
    const response = await apiClient.get('/api/v1/presets', { params })
    return response.data
  },

  async getPreset(presetUuid: string): Promise<PresetResponse> {
    const response = await apiClient.get(`/api/v1/presets/${presetUuid}`)
    return response.data
  },

  async updatePreset(presetUuid: string, request: PresetUpdateRequest): Promise<PresetResponse> {
    const response = await apiClient.put(`/api/v1/presets/${presetUuid}`, request)
    return response.data
  },

  async deletePreset(presetUuid: string): Promise<void> {
    await apiClient.delete(`/api/v1/presets/${presetUuid}`)
  },

  async usePreset(presetUuid: string): Promise<void> {
    await apiClient.post(`/api/v1/presets/${presetUuid}/use`)
  }
}