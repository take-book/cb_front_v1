<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed top-4 right-4 z-50 max-w-sm">
      <div 
        :class="[
          'rounded-lg shadow-lg p-4 border backdrop-blur-sm',
          'transform transition-all duration-300 ease-in-out',
          visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
          typeClasses
        ]"
      >
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <component :is="iconComponent" class="h-5 w-5" />
          </div>
          <div class="ml-3 flex-1">
            <p :class="textClass" class="text-sm font-medium">
              {{ title }}
            </p>
            <p v-if="message" :class="messageClass" class="mt-1 text-sm">
              {{ message }}
            </p>
          </div>
          <div class="ml-4 flex-shrink-0">
            <button
              @click="close"
              :class="buttonClass"
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
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

interface Props {
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  show: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 5000
})

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)

const typeClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-50/90 border-green-200 text-green-800'
    case 'error':
      return 'bg-red-50/90 border-red-200 text-red-800'
    case 'warning':
      return 'bg-yellow-50/90 border-yellow-200 text-yellow-800'
    default:
      return 'bg-blue-50/90 border-blue-200 text-blue-800'
  }
})

const textClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'text-green-800'
    case 'error':
      return 'text-red-800'
    case 'warning':
      return 'text-yellow-800'
    default:
      return 'text-blue-800'
  }
})

const messageClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'text-green-700'
    case 'error':
      return 'text-red-700'
    case 'warning':
      return 'text-yellow-700'
    default:
      return 'text-blue-700'
  }
})

const buttonClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'text-green-400 hover:text-green-500 focus:ring-green-600'
    case 'error':
      return 'text-red-400 hover:text-red-500 focus:ring-red-600'
    case 'warning':
      return 'text-yellow-400 hover:text-yellow-500 focus:ring-yellow-600'
    default:
      return 'text-blue-400 hover:text-blue-500 focus:ring-blue-600'
  }
})

const iconComponent = computed(() => {
  switch (props.type) {
    case 'success':
      return 'svg'
    case 'error':
      return 'svg'
    case 'warning':
      return 'svg'
    default:
      return 'svg'
  }
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    visible.value = true
    if (props.duration > 0) {
      setTimeout(() => {
        close()
      }, props.duration)
    }
  } else {
    visible.value = false
  }
})

const close = () => {
  visible.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}

onMounted(() => {
  if (props.show) {
    visible.value = true
    if (props.duration > 0) {
      setTimeout(() => {
        close()
      }, props.duration)
    }
  }
})
</script>