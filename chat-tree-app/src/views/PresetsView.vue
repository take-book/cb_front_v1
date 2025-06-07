<template>
  <AppLayout>
    <div class="presets-view p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Presets</h1>
      <p class="text-gray-600">Manage conversation presets with model settings</p>
    </div>

    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Sidebar -->
      <div class="lg:w-1/4">
        <div class="bg-white rounded-lg shadow p-4 mb-4">
          <button
            @click="showCreateModal = true"
            class="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          >
            New Preset
          </button>
          
          <!-- Filters -->
          <div>
            <h3 class="font-medium text-gray-900 mb-2">Filters</h3>
            <label class="flex items-center">
              <input
                v-model="showFavoritesOnly"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-700">Favorites only</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="lg:w-3/4">
        <!-- Search Bar -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <div class="relative">
            <input
              v-model="searchQuery"
              @input="handleSearch"
              type="text"
              placeholder="Search presets..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Presets Grid -->
        <div v-if="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Loading presets...</p>
        </div>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p class="text-red-700">{{ error }}</p>
          <button
            @click="loadPresets"
            class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="preset in filteredPresets"
            :key="preset.uuid"
            class="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1">
                <h3 class="text-lg font-medium text-gray-900 mb-1">{{ preset.name }}</h3>
                <p v-if="preset.description" class="text-gray-600 text-sm">{{ preset.description }}</p>
              </div>
              
              <div class="flex items-center space-x-2 ml-4">
                <button
                  @click="toggleFavorite(preset.uuid)"
                  :class="[
                    'p-2 rounded hover:bg-gray-100',
                    preset.is_favorite ? 'text-yellow-500' : 'text-gray-400'
                  ]"
                >
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
                
                <button
                  @click="editPreset(preset)"
                  class="p-2 rounded hover:bg-gray-100 text-gray-600"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button
                  @click="deletePreset(preset.uuid)"
                  class="p-2 rounded hover:bg-gray-100 text-red-600"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Model and Settings -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div class="bg-gray-50 rounded p-3">
                <div class="text-xs text-gray-500 uppercase tracking-wide">Model</div>
                <div class="text-sm font-medium text-gray-900">{{ preset.model_id }}</div>
              </div>
              
              <div class="bg-gray-50 rounded p-3">
                <div class="text-xs text-gray-500 uppercase tracking-wide">Temperature</div>
                <div class="text-sm font-medium text-gray-900">{{ preset.temperature }}</div>
              </div>
              
              <div class="bg-gray-50 rounded p-3">
                <div class="text-xs text-gray-500 uppercase tracking-wide">Max Tokens</div>
                <div class="text-sm font-medium text-gray-900">{{ preset.max_tokens }}</div>
              </div>
              
              <div class="bg-gray-50 rounded p-3">
                <div class="text-xs text-gray-500 uppercase tracking-wide">Used</div>
                <div class="text-sm font-medium text-gray-900">{{ preset.usage_count }} times</div>
              </div>
            </div>

            <!-- System Prompt -->
            <div v-if="preset.system_prompt" class="mb-4">
              <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">System Prompt</div>
              <div class="bg-gray-50 rounded p-3">
                <pre class="text-sm text-gray-700 whitespace-pre-wrap">{{ preset.system_prompt }}</pre>
              </div>
            </div>

            <div class="flex justify-between items-center">
              <div class="text-sm text-gray-500">
                Updated {{ formatDate(preset.updated_at) }}
              </div>
              
              <button
                @click="usePreset(preset)"
                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Use Preset
              </button>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center mt-8">
            <nav class="flex space-x-2">
              <button
                v-for="page in totalPages"
                :key="page"
                @click="setPage(page)"
                :class="[
                  'px-3 py-2 rounded',
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                ]"
              >
                {{ page }}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <PresetModal
      v-if="showCreateModal || showEditModal"
      :preset="editingPreset"
      @save="handleSavePreset"
      @close="closeModal"
    />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePresetsStore } from '../stores/presets'
import type { PresetResponse } from '../types/api'
import PresetModal from '../components/PresetModal.vue'
import AppLayout from '../components/AppLayout.vue'

const presetsStore = usePresetsStore()

// Reactive refs
const searchQuery = ref('')
const showFavoritesOnly = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingPreset = ref<PresetResponse | null>(null)

// Computed
const {
  presets,
  loading,
  error,
  totalPages,
  currentPage,
  favoritePresets
} = presetsStore

const filteredPresets = computed(() => {
  if (showFavoritesOnly.value) {
    return favoritePresets
  }
  return presets
})

// Methods
const loadPresets = async () => {
  await presetsStore.fetchPresets({
    is_favorite: showFavoritesOnly.value || null,
    q: searchQuery.value || null
  })
}

const handleSearch = async () => {
  await presetsStore.searchPresets(searchQuery.value)
}

const toggleFavorite = async (presetUuid: string) => {
  await presetsStore.toggleFavorite(presetUuid)
}

const editPreset = (preset: PresetResponse) => {
  editingPreset.value = preset
  showEditModal.value = true
}

const deletePreset = async (presetUuid: string) => {
  if (confirm('Are you sure you want to delete this preset?')) {
    await presetsStore.deletePreset(presetUuid)
  }
}

const usePreset = async (preset: PresetResponse) => {
  await presetsStore.usePreset(preset.uuid)
  // Here you would typically apply the preset settings to a new chat
  // or emit an event to the parent component
}

const handleSavePreset = async (presetData: any) => {
  if (editingPreset.value) {
    await presetsStore.updatePreset(editingPreset.value.uuid, presetData)
  } else {
    await presetsStore.createPreset(presetData)
  }
  closeModal()
}

const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  editingPreset.value = null
}

const setPage = async (page: number) => {
  await presetsStore.setPage(page)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

// Watchers
watch([showFavoritesOnly], () => {
  loadPresets()
})

// Lifecycle
onMounted(async () => {
  await presetsStore.fetchPresets()
})
</script>