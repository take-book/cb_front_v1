import { vi } from 'vitest'

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => null),
    removeItem: vi.fn(() => null),
    clear: vi.fn(() => null)
  },
  writable: true
})

// Mock console.log to avoid noise in tests
global.console = {
  ...console,
  log: vi.fn()
}