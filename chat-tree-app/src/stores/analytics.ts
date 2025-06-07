import { defineStore } from 'pinia'
import { ref } from 'vue'
import { analyticsApi } from '../api/analytics'
import type {
  AnalyticsResponse,
  AnalyticsParams,
  UsageStatsResponse,
  ModelUsageStats,
  DailyUsageStats,
  HourlyUsageStats
} from '../types/api'
import { useToast } from '../composables/useToast'

export const useAnalyticsStore = defineStore('analytics', () => {
  const { showToast } = useToast()
  
  // State
  const analytics = ref<AnalyticsResponse | null>(null)
  const overview = ref<UsageStatsResponse | null>(null)
  const modelBreakdown = ref<ModelUsageStats[]>([])
  const dailyUsage = ref<DailyUsageStats[]>([])
  const hourlyPattern = ref<HourlyUsageStats[]>([])
  const costTrends = ref<Record<string, any>[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Current filter state
  const currentPeriod = ref<'1d' | '7d' | '30d' | '90d' | '1y'>('7d')
  const currentTimezone = ref<string>('UTC')
  const currentModelFilter = ref<string | null>(null)

  // Actions
  const fetchAnalytics = async (params?: AnalyticsParams) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await analyticsApi.getAnalytics({
        period: currentPeriod.value,
        timezone: currentTimezone.value,
        model_filter: currentModelFilter.value,
        ...params
      })
      
      analytics.value = response
      overview.value = response.overview
      modelBreakdown.value = response.model_breakdown
      dailyUsage.value = response.daily_usage
      hourlyPattern.value = response.hourly_pattern
      costTrends.value = response.cost_trends
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch analytics'
      showToast('Failed to fetch analytics', 'error')
    } finally {
      loading.value = false
    }
  }

  const fetchUsageOverview = async (params?: AnalyticsParams) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await analyticsApi.getUsageOverview({
        period: currentPeriod.value,
        timezone: currentTimezone.value,
        model_filter: currentModelFilter.value,
        ...params
      })
      
      overview.value = response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch usage overview'
      showToast('Failed to fetch usage overview', 'error')
    } finally {
      loading.value = false
    }
  }

  const fetchModelBreakdown = async (params?: AnalyticsParams) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await analyticsApi.getModelBreakdown({
        period: currentPeriod.value,
        timezone: currentTimezone.value,
        model_filter: currentModelFilter.value,
        ...params
      })
      
      modelBreakdown.value = response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch model breakdown'
      showToast('Failed to fetch model breakdown', 'error')
    } finally {
      loading.value = false
    }
  }

  const fetchDailyUsage = async (params?: AnalyticsParams) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await analyticsApi.getDailyUsage({
        period: currentPeriod.value,
        timezone: currentTimezone.value,
        model_filter: currentModelFilter.value,
        ...params
      })
      
      dailyUsage.value = response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch daily usage'
      showToast('Failed to fetch daily usage', 'error')
    } finally {
      loading.value = false
    }
  }

  const fetchHourlyPattern = async (params?: AnalyticsParams) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await analyticsApi.getHourlyPattern({
        period: currentPeriod.value,
        timezone: currentTimezone.value,
        model_filter: currentModelFilter.value,
        ...params
      })
      
      hourlyPattern.value = response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch hourly pattern'
      showToast('Failed to fetch hourly pattern', 'error')
    } finally {
      loading.value = false
    }
  }

  const fetchCostAnalysis = async (params?: AnalyticsParams) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await analyticsApi.getCostAnalysis({
        period: currentPeriod.value,
        timezone: currentTimezone.value,
        model_filter: currentModelFilter.value,
        ...params
      })
      
      costTrends.value = response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch cost analysis'
      showToast('Failed to fetch cost analysis', 'error')
    } finally {
      loading.value = false
    }
  }

  const setPeriod = async (period: '1d' | '7d' | '30d' | '90d' | '1y') => {
    currentPeriod.value = period
    await fetchAnalytics()
  }

  const setTimezone = async (timezone: string) => {
    currentTimezone.value = timezone
    await fetchAnalytics()
  }

  const setModelFilter = async (modelId: string | null) => {
    currentModelFilter.value = modelId
    await fetchAnalytics()
  }

  const refreshAll = async () => {
    await fetchAnalytics()
  }

  const clearError = () => {
    error.value = null
  }

  const clearData = () => {
    analytics.value = null
    overview.value = null
    modelBreakdown.value = []
    dailyUsage.value = []
    hourlyPattern.value = []
    costTrends.value = []
  }

  return {
    // State
    analytics,
    overview,
    modelBreakdown,
    dailyUsage,
    hourlyPattern,
    costTrends,
    loading,
    error,
    currentPeriod,
    currentTimezone,
    currentModelFilter,
    
    // Actions
    fetchAnalytics,
    fetchUsageOverview,
    fetchModelBreakdown,
    fetchDailyUsage,
    fetchHourlyPattern,
    fetchCostAnalysis,
    setPeriod,
    setTimezone,
    setModelFilter,
    refreshAll,
    clearError,
    clearData
  }
})