<template>
  <RouterView />
  
  <!-- Toast Container -->
  <div class="fixed top-4 right-4 z-50 space-y-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="[
        'max-w-sm rounded-lg shadow-lg p-4 border backdrop-blur-sm',
        'transform transition-all duration-300 ease-in-out',
        'translate-x-0 opacity-100',
        getToastClasses(toast.type)
      ]"
    >
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <component :is="getToastIcon(toast.type)" class="h-5 w-5" />
        </div>
        <div class="ml-3 flex-1">
          <p :class="getToastTextClass(toast.type)" class="text-sm font-medium">
            {{ toast.title }}
          </p>
          <p v-if="toast.message" :class="getToastMessageClass(toast.type)" class="mt-1 text-sm">
            {{ toast.message }}
          </p>
        </div>
        <div class="ml-4 flex-shrink-0">
          <button
            @click="removeToast(toast.id)"
            :class="getToastButtonClass(toast.type)"
            class="inline-flex rounded-md p-1.5 hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, h } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useToastStyling } from '@/composables/useToastStyling'

const authStore = useAuthStore()
const { toasts, removeToast } = useToast()
const { getToastClasses, getToastTextClass, getToastMessageClass, getToastButtonClass, getToastIcon } = useToastStyling()

onMounted(async () => {
  // Initialize auth from localStorage
  console.log('App.vue: Initializing auth from storage...')
  await authStore.initializeFromStorage()
  console.log('App.vue: Auth initialization complete. Authenticated:', authStore.isAuthenticated)
})

</script>