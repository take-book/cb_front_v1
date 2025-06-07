import apiClient from './client'
import type {
  AnalyticsResponse,
  AnalyticsParams,
  UsageStatsResponse,
  ModelUsageStats,
  DailyUsageStats,
  HourlyUsageStats
} from '../types/api'

export const analyticsApi = {
  async getAnalytics(params?: AnalyticsParams): Promise<AnalyticsResponse> {
    const response = await apiClient.get('/api/v1/analytics', { params })
    return response.data
  },

  async getUsageOverview(params?: AnalyticsParams): Promise<UsageStatsResponse> {
    const response = await apiClient.get('/api/v1/analytics/overview', { params })
    return response.data
  },

  async getModelBreakdown(params?: AnalyticsParams): Promise<ModelUsageStats[]> {
    const response = await apiClient.get('/api/v1/analytics/models', { params })
    return response.data
  },

  async getDailyUsage(params?: AnalyticsParams): Promise<DailyUsageStats[]> {
    const response = await apiClient.get('/api/v1/analytics/daily', { params })
    return response.data
  },

  async getHourlyPattern(params?: AnalyticsParams): Promise<HourlyUsageStats[]> {
    const response = await apiClient.get('/api/v1/analytics/hourly', { params })
    return response.data
  },

  async getCostAnalysis(params?: AnalyticsParams): Promise<Record<string, any>[]> {
    const response = await apiClient.get('/api/v1/analytics/costs', { params })
    return response.data
  }
}