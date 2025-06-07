import apiClient from './client'
import type {
  TemplateCreateRequest,
  TemplateUpdateRequest,
  TemplateResponse,
  TemplateListParams,
  PaginatedResponse
} from '../types/api'

export const templatesApi = {
  async createTemplate(request: TemplateCreateRequest): Promise<TemplateResponse> {
    const response = await apiClient.post('/api/v1/templates', request)
    return response.data
  },

  async getTemplates(params?: TemplateListParams): Promise<PaginatedResponse> {
    const response = await apiClient.get('/api/v1/templates', { params })
    return response.data
  },

  async getTemplate(templateUuid: string): Promise<TemplateResponse> {
    const response = await apiClient.get(`/api/v1/templates/${templateUuid}`)
    return response.data
  },

  async updateTemplate(templateUuid: string, request: TemplateUpdateRequest): Promise<TemplateResponse> {
    const response = await apiClient.put(`/api/v1/templates/${templateUuid}`, request)
    return response.data
  },

  async deleteTemplate(templateUuid: string): Promise<void> {
    await apiClient.delete(`/api/v1/templates/${templateUuid}`)
  },

  async useTemplate(templateUuid: string): Promise<void> {
    await apiClient.post(`/api/v1/templates/${templateUuid}/use`)
  },

  async getTemplateCategories(): Promise<string[]> {
    const response = await apiClient.get('/api/v1/templates/categories')
    return response.data
  }
}