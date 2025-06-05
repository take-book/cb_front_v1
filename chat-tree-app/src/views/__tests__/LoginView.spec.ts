import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginView from '../LoginView.vue'
import { useAuthStore } from '@/stores/auth'
import { nextTick } from 'vue'
import router from '@/router'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  }),
  createRouter: vi.fn(() => ({
    push: vi.fn(),
    beforeEach: vi.fn()
  })),
  createWebHistory: vi.fn()
}))

describe('LoginView', () => {
  const mountOptions = {
    global: {
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>'
        }
      }
    }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    const wrapper = mount(LoginView, mountOptions)
    
    expect(wrapper.find('h1').text()).toBe('ChatTree')
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('should validate required fields', async () => {
    const wrapper = mount(LoginView, mountOptions)
    
    // Submit empty form
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()
    
    expect(wrapper.text()).toContain('Username and password are required')
  })

  it('should call login with correct credentials', async () => {
    const wrapper = mount(LoginView, mountOptions)
    const authStore = useAuthStore()
    authStore.login = vi.fn().mockResolvedValue(undefined)
    
    // Fill in form
    await wrapper.find('input[type="text"]').setValue('testuser')
    await wrapper.find('input[type="password"]').setValue('password123')
    
    // Submit form
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()
    
    expect(authStore.login).toHaveBeenCalledWith('testuser', 'password123')
  })

  it('should show loading state during login', async () => {
    const wrapper = mount(LoginView, mountOptions)
    const authStore = useAuthStore()
    
    // Mock login to return a pending promise
    let resolveLogin: () => void
    authStore.login = vi.fn().mockReturnValue(new Promise<void>(resolve => {
      resolveLogin = resolve
    }))
    
    // Fill and submit form
    await wrapper.find('input[type="text"]').setValue('testuser')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()
    
    // Check loading state
    expect(wrapper.find('button[type="submit"]').text()).toBe('Signing in...')
    expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(true)
    
    // Resolve login
    resolveLogin!()
    await new Promise(resolve => setTimeout(resolve, 10))
    await nextTick()
    
    expect(wrapper.find('button[type="submit"]').text()).toBe('Sign In')
    expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('should display error message on login failure', async () => {
    const wrapper = mount(LoginView, mountOptions)
    const authStore = useAuthStore()
    authStore.login = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
    
    // Fill and submit form
    await wrapper.find('input[type="text"]').setValue('testuser')
    await wrapper.find('input[type="password"]').setValue('wrongpassword')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()
    
    expect(wrapper.text()).toContain('Invalid credentials')
  })

  it('should have link to register page', () => {
    const wrapper = mount(LoginView, mountOptions)
    
    expect(wrapper.find('a').text()).toContain('Create one here')
  })
})