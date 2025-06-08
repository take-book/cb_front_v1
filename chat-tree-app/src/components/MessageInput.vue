<template>
  <div class="p-4 bg-gray-50 border-t border-gray-200">
    <form @submit.prevent="handleSubmit" data-test="message-form">
      <div class="flex space-x-2">
        <div class="flex-1">
          <textarea
            id="message"
            v-model="localMessage"
            data-test="message-input"
            placeholder="Type your message here..."
            rows="3"
            class="w-full resize-none border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            :disabled="isDisabled"
            @keydown.meta.enter="handleSubmit"
            @keydown.ctrl.enter="handleSubmit"
          ></textarea>
        </div>
        <div class="flex flex-col justify-end">
          <button
            type="submit"
            data-test="submit-button"
            :disabled="!localMessage.trim() || isDisabled"
            :class="submitButtonClasses"
          >
            <span v-if="isLoading" class="flex items-center space-x-1">
              <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>...</span>
            </span>
            <span v-else-if="isBranchingMode">
              🌿 Branch
            </span>
            <span v-else>
              📤 Send
            </span>
          </button>
        </div>
      </div>
      
      <!-- Controls Row -->
      <div class="flex justify-between items-center mt-2">
        <div class="flex items-center space-x-4">
          <div class="text-xs text-gray-500">
            ⌘+Enter or Ctrl+Enter to send
          </div>
          
          <!-- Streaming Toggle -->
          <div class="flex items-center space-x-2" v-if="showStreamingToggle">
            <label class="text-xs text-gray-600">Streaming:</label>
            <button
              type="button"
              @click="toggleStreaming"
              :class="streamingToggleClasses"
            >
              <span :class="streamingIndicatorClasses" />
            </button>
            <span class="text-xs" :class="streamingTextClasses">
              {{ localUseStreaming ? 'SSE' : 'REST' }}
            </span>
          </div>
        </div>
        
        <!-- Mode Indicator -->
        <div class="text-xs" :class="modeIndicatorClasses">
          <span v-if="isBranchingMode">🌿 Creating new branch</span>
          <span v-else>✅ Continuing conversation</span>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: string
  isLoading?: boolean
  isBranchingMode?: boolean
  useStreaming?: boolean
  showStreamingToggle?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'update:useStreaming', value: boolean): void
  (e: 'submit', message: string): void
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isBranchingMode: false,
  useStreaming: true,
  showStreamingToggle: true,
  disabled: false
})

const emit = defineEmits<Emits>()

// Local reactive copies
const localMessage = ref(props.modelValue)
const localUseStreaming = ref(props.useStreaming)

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  localMessage.value = newValue
})

watch(() => props.useStreaming, (newValue) => {
  localUseStreaming.value = newValue
})

// Computed properties
const isDisabled = computed(() => props.disabled || props.isLoading)

const submitButtonClasses = computed(() => [
  'px-3 py-2 rounded-md font-medium transition-colors text-sm',
  props.isBranchingMode 
    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
    : 'bg-indigo-600 hover:bg-indigo-700 text-white',
  (!localMessage.value.trim() || isDisabled.value) && 'bg-gray-400 cursor-not-allowed'
])

const streamingToggleClasses = computed(() => [
  'relative inline-flex h-4 w-8 items-center rounded-full transition-colors',
  localUseStreaming.value ? 'bg-indigo-600' : 'bg-gray-300'
])

const streamingIndicatorClasses = computed(() => [
  'inline-block h-3 w-3 transform rounded-full bg-white transition',
  localUseStreaming.value ? 'translate-x-4' : 'translate-x-0.5'
])

const streamingTextClasses = computed(() => 
  localUseStreaming.value ? 'text-indigo-600' : 'text-gray-500'
)

const modeIndicatorClasses = computed(() => 
  props.isBranchingMode ? 'text-orange-600' : 'text-green-600'
)

// Methods
const handleSubmit = () => {
  if (!localMessage.value.trim() || isDisabled.value) return
  
  const message = localMessage.value.trim()
  emit('submit', message)
  // Note: Parent component will handle clearing the input via v-model
}

const toggleStreaming = () => {
  localUseStreaming.value = !localUseStreaming.value
  emit('update:useStreaming', localUseStreaming.value)
}

// Sync local changes back to parent
watch(localMessage, (newValue) => {
  emit('update:modelValue', newValue)
})
</script>