import { h, type VNode } from 'vue'

type ToastType = 'success' | 'error' | 'warning' | 'info'

export const useToastStyling = () => {
  const getToastClasses = (type: string): string => {
    switch (type) {
      case 'success':
        return 'bg-green-50/90 border-green-200'
      case 'error':
        return 'bg-red-50/90 border-red-200'
      case 'warning':
        return 'bg-yellow-50/90 border-yellow-200'
      default:
        return 'bg-blue-50/90 border-blue-200'
    }
  }

  const getToastTextClass = (type: string): string => {
    switch (type) {
      case 'success':
        return 'text-green-800'
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-yellow-800'
      default:
        return 'text-blue-800'
    }
  }

  const getToastMessageClass = (type: string): string => {
    switch (type) {
      case 'success':
        return 'text-green-700'
      case 'error':
        return 'text-red-700'
      case 'warning':
        return 'text-yellow-700'
      default:
        return 'text-blue-700'
    }
  }

  const getToastButtonClass = (type: string): string => {
    switch (type) {
      case 'success':
        return 'text-green-400 hover:text-green-500 focus:ring-green-600'
      case 'error':
        return 'text-red-400 hover:text-red-500 focus:ring-red-600'
      case 'warning':
        return 'text-yellow-400 hover:text-yellow-500 focus:ring-yellow-600'
      default:
        return 'text-blue-400 hover:text-blue-500 focus:ring-blue-600'
    }
  }

  const getToastIcon = (type: string): VNode => {
    const iconProps = { class: 'h-5 w-5' }
    
    switch (type) {
      case 'success':
        return h('svg', { ...iconProps, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
          h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' })
        ])
      case 'error':
        return h('svg', { ...iconProps, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
          h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
        ])
      case 'warning':
        return h('svg', { ...iconProps, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
          h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' })
        ])
      default:
        return h('svg', { ...iconProps, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
          h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
        ])
    }
  }

  return {
    getToastClasses,
    getToastTextClass,
    getToastMessageClass,
    getToastButtonClass,
    getToastIcon
  }
}