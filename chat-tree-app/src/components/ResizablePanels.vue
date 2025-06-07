<template>
  <div class="resizable-panels-container h-full flex overflow-hidden" ref="containerRef">
    <!-- Left Panel -->
    <div class="flex-shrink-0" :style="{ width: `${leftPanelWidth}px` }">
      <slot name="left" />
    </div>

    <!-- Resizable Divider -->
    <div 
      class="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize transition-colors relative flex-shrink-0"
      @mousedown="startResize"
      data-test="resize-divider"
    >
      <div class="absolute inset-y-0 -left-1 -right-1 z-10"></div>
    </div>

    <!-- Right Panel -->
    <div class="flex-1 min-w-0" :style="{ width: `${rightPanelWidth}px` }">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  minLeftWidth?: number
  minRightWidth?: number
  storageKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  minLeftWidth: 300,
  minRightWidth: 450,
  storageKey: 'chatview'
})

const emit = defineEmits<{
  resize: [{ leftWidth: number; rightWidth: number }]
}>()

const containerRef = ref<HTMLElement>()
const isResizing = ref(false)

// Panel widths with reactive constraints
const _leftPanelWidth = ref(Math.max(props.minLeftWidth, window.innerWidth - 600))
const _rightPanelWidth = ref(500)

const leftPanelWidth = computed({
  get: () => _leftPanelWidth.value,
  set: (value: number) => {
    _leftPanelWidth.value = Math.max(props.minLeftWidth, value)
  }
})

const rightPanelWidth = computed({
  get: () => _rightPanelWidth.value,
  set: (value: number) => {
    _rightPanelWidth.value = Math.max(props.minRightWidth, value)
  }
})

// Storage keys
const leftWidthKey = `${props.storageKey}-left-panel-width`
const rightWidthKey = `${props.storageKey}-right-panel-width`

// Watch for width changes and emit events
watch([leftPanelWidth, rightPanelWidth], ([newLeft, newRight]) => {
  emit('resize', { leftWidth: newLeft, rightWidth: newRight })
})

// Resizing logic
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startLeftWidth = leftPanelWidth.value
  const startRightWidth = rightPanelWidth.value

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value || !containerRef.value) return
    
    const deltaX = e.clientX - startX
    const containerWidth = containerRef.value.offsetWidth
    
    // Calculate new widths with constraints
    const newLeftWidth = Math.max(
      props.minLeftWidth, 
      Math.min(containerWidth - props.minRightWidth - 5, startLeftWidth + deltaX)
    )
    const newRightWidth = containerWidth - newLeftWidth - 5 // 5px for divider
    
    _leftPanelWidth.value = newLeftWidth
    _rightPanelWidth.value = Math.max(props.minRightWidth, newRightWidth)
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    // Save panel sizes to localStorage
    savePanelSizes()
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// Save panel sizes to localStorage
const savePanelSizes = () => {
  localStorage.setItem(leftWidthKey, leftPanelWidth.value.toString())
  localStorage.setItem(rightWidthKey, rightPanelWidth.value.toString())
}

// Handle window resize
const handleWindowResize = () => {
  if (!containerRef.value) return
  
  const totalWidth = window.innerWidth
  const currentTotal = leftPanelWidth.value + rightPanelWidth.value + 5
  
  if (currentTotal > totalWidth) {
    const availableWidth = totalWidth - 5
    const ratio = leftPanelWidth.value / (leftPanelWidth.value + rightPanelWidth.value)
    
    _leftPanelWidth.value = Math.max(props.minLeftWidth, Math.floor(availableWidth * ratio))
    _rightPanelWidth.value = Math.max(props.minRightWidth, availableWidth - _leftPanelWidth.value)
  }
}

// Restore panel sizes from localStorage
const restorePanelSizes = () => {
  const savedLeftWidth = localStorage.getItem(leftWidthKey)
  const savedRightWidth = localStorage.getItem(rightWidthKey)
  
  if (savedLeftWidth) {
    _leftPanelWidth.value = Math.max(props.minLeftWidth, parseInt(savedLeftWidth))
  }
  if (savedRightWidth) {
    _rightPanelWidth.value = Math.max(props.minRightWidth, parseInt(savedRightWidth))
  }
}

onMounted(() => {
  restorePanelSizes()
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
})

// Expose for testing
defineExpose({
  leftPanelWidth,
  rightPanelWidth,
  isResizing
})
</script>

<style scoped>
.resizable-panels-container {
  user-select: none;
}

.resizable-panels-container.resizing {
  user-select: none;
}
</style>