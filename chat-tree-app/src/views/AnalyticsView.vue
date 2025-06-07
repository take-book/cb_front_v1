<template>
  <AppLayout>
    <div class="analytics-view p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Analytics</h1>
      <p class="text-gray-600">Usage statistics and insights</p>
    </div>

    <!-- Controls -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <!-- Period Selector -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Period</label>
          <select
            v-model="selectedPeriod"
            @change="handlePeriodChange"
            class="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>

        <!-- Model Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <select
            v-model="selectedModel"
            @change="handleModelChange"
            class="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Models</option>
            <option v-for="model in availableModels" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
        </div>

        <!-- Refresh Button -->
        <div class="flex items-end">
          <button
            @click="refreshAll"
            :disabled="loading"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <svg v-if="loading" class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">Loading analytics...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-700">{{ error }}</p>
      <button
        @click="refreshAll"
        class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
      >
        Try again
      </button>
    </div>

    <div v-else-if="overview" class="space-y-6">
      <!-- Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-1">
              <h3 class="text-lg font-medium text-gray-900 mb-1">Total Messages</h3>
              <p class="text-3xl font-bold text-blue-600">{{ overview.total_messages.toLocaleString() }}</p>
            </div>
            <div class="bg-blue-100 rounded-full p-3">
              <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-1">
              <h3 class="text-lg font-medium text-gray-900 mb-1">Total Tokens</h3>
              <p class="text-3xl font-bold text-green-600">{{ overview.total_tokens.toLocaleString() }}</p>
            </div>
            <div class="bg-green-100 rounded-full p-3">
              <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-1">
              <h3 class="text-lg font-medium text-gray-900 mb-1">Total Cost</h3>
              <p class="text-3xl font-bold text-purple-600">${{ overview.total_cost.toFixed(2) }}</p>
            </div>
            <div class="bg-purple-100 rounded-full p-3">
              <svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Model Breakdown -->
      <div v-if="modelBreakdown.length > 0" class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Model Usage Breakdown</h3>
        <div class="space-y-3">
          <div
            v-for="model in modelBreakdown"
            :key="model.model_id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded"
          >
            <div class="flex-1">
              <div class="font-medium text-gray-900">{{ model.model_name }}</div>
              <div class="text-sm text-gray-500">
                {{ model.message_count }} messages • {{ model.token_count.toLocaleString() }} tokens
              </div>
            </div>
            <div class="text-right">
              <div class="font-medium text-gray-900">${{ model.cost.toFixed(2) }}</div>
              <div class="text-sm text-gray-500">{{ model.percentage.toFixed(1) }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Usage Chart -->
      <div v-if="dailyUsage.length > 0" class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Daily Usage</h3>
        <div class="space-y-2">
          <div
            v-for="day in dailyUsage"
            :key="day.date"
            class="flex items-center justify-between p-2"
          >
            <div class="text-sm text-gray-600">{{ formatDate(day.date) }}</div>
            <div class="flex items-center space-x-4 text-sm">
              <span class="text-blue-600">{{ day.message_count }} messages</span>
              <span class="text-green-600">{{ day.token_count.toLocaleString() }} tokens</span>
              <span class="text-purple-600">${{ day.cost.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Hourly Pattern -->
      <div v-if="hourlyPattern.length > 0" class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Hourly Usage Pattern</h3>
        <div class="grid grid-cols-12 gap-2">
          <div
            v-for="hour in hourlyPattern"
            :key="hour.hour"
            class="text-center"
          >
            <div class="text-xs text-gray-500 mb-1">{{ hour.hour }}:00</div>
            <div class="bg-blue-100 rounded" :style="{ height: `${getHourlyBarHeight(hour.message_count)}px` }">
              <div class="text-xs text-blue-700 p-1">{{ hour.message_count }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '../stores/analytics'
import { useModelsStore } from '../stores/models'
import AppLayout from '../components/AppLayout.vue'

const analyticsStore = useAnalyticsStore()
const modelsStore = useModelsStore()

// Reactive refs
const selectedPeriod = ref<'1d' | '7d' | '30d' | '90d' | '1y'>('7d')
const selectedModel = ref<string>('')

// Computed
const {
  overview,
  modelBreakdown,
  dailyUsage,
  hourlyPattern,
  loading,
  error
} = analyticsStore

const { models: availableModels } = modelsStore

// Methods
const handlePeriodChange = async () => {
  await analyticsStore.setPeriod(selectedPeriod.value)
}

const handleModelChange = async () => {
  await analyticsStore.setModelFilter(selectedModel.value || null)
}

const refreshAll = async () => {
  await analyticsStore.refreshAll()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const getHourlyBarHeight = (count: number) => {
  const maxCount = Math.max(...hourlyPattern.map(h => h.message_count))
  return maxCount > 0 ? (count / maxCount) * 80 + 20 : 20
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    modelsStore.fetchModels(),
    analyticsStore.fetchAnalytics()
  ])
})
</script>