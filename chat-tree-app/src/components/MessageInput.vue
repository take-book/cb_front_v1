<template>
  <div class="p-6 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200/50 shadow-sm">
    <form @submit.prevent="handleSubmit" data-test="message-form">
      <div class="flex space-x-4">
        <div class="flex-1">
          <textarea
            id="message"
            v-model="localMessage"
            data-test="message-input"
            placeholder="Type your message here..."
            rows="3"
            class="textarea-modern"
            :disabled="isDisabled"
            @keydown.meta.enter="handleSubmit"
            @keydown.ctrl.enter="handleSubmit"
          ></textarea>
        </div>
        <div class="flex flex-col justify-end space-y-2">
          <button
            type="submit"
            data-test="submit-button"
            :disabled="!localMessage.trim() || isDisabled"
            :class="submitButtonClasses"
          >
            <span v-if="isLoading" class="flex items-center space-x-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Sending...</span>
            </span>
            <span v-else-if="isBranchingMode" class="flex items-center space-x-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Branch</span>
            </span>
            <span v-else class="flex items-center space-x-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Send</span>
            </span>
          </button>
        </div>
      </div>
      
      <!-- Controls Row -->
      <div class="flex justify-between items-center mt-4">
        <div class="flex items-center space-x-6">
          <div class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            ⌘+Enter or Ctrl+Enter to send
          </div>
          
          <!-- Streaming Toggle -->
          <div class="flex items-center space-x-3" v-if="showStreamingToggle">
            <label class="text-xs font-medium text-gray-600">Mode:</label>
            <button
              type="button"
              @click="toggleStreaming"
              :class="streamingToggleClasses"
            >
              <span :class="streamingIndicatorClasses" />
            </button>
            <span class="text-xs font-medium" :class="streamingTextClasses">
              {{ localUseStreaming ? 'Streaming' : 'Standard' }}
            </span>
          </div>
        </div>
        
        <!-- Mode Indicator -->
        <div class="flex items-center space-x-2">
          <span v-if="isBranchingMode" class="state-badge state-branching">
            🌿 Branching Mode
          </span>
          <span v-else class="state-badge state-continuing">
            → Continue Mode
          </span>
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
  props.isBranchingMode 
    ? 'btn-secondary border-orange-300 text-orange-700 hover:bg-orange-50' 
    : 'btn-primary',
  (!localMessage.value.trim() || isDisabled.value) && '!bg-gray-300 !text-gray-500 cursor-not-allowed !transform-none !shadow-none'
])

const streamingToggleClasses = computed(() => [
  'relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-200',
  localUseStreaming.value ? 'bg-indigo-600' : 'bg-gray-300'
])

const streamingIndicatorClasses = computed(() => [
  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-md',
  localUseStreaming.value ? 'translate-x-5' : 'translate-x-0.5'
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