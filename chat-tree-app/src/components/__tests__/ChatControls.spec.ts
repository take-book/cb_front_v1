import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatControls from '../ChatControls.vue'

// Mock child components
vi.mock('@/components/ModelSelector.vue', () => ({
  default: {
    name: 'ModelSelector',
    template: '<div data-test="model-selector">ModelSelector</div>',
    props: ['modelValue', 'showDetails', 'autoSelect'],
    emits: ['model-selected', 'update:modelValue']
  }
}))

describe('ChatControls', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render system message toggle button', () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: true,
        messageCount: 5,
        chatTitle: 'Test Chat'
      }
    })

    const toggleButton = wrapper.find('[data-test="system-messages-toggle"]')
    expect(toggleButton.exists()).toBe(true)
    expect(toggleButton.text()).toContain('Hide System Messages')
  })

  it('should show correct toggle text when system messages are visible', () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: true,
        messageCount: 5,
        chatTitle: 'Test Chat'
      }
    })

    const toggleButton = wrapper.find('[data-test="system-messages-toggle"]')
    expect(toggleButton.text()).toContain('Hide System Messages')
    expect(toggleButton.find('.system-toggle-icon').text()).toBe('👁️')
  })

  it('should show correct toggle text when system messages are hidden', () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: false,
        messageCount: 5,
        chatTitle: 'Test Chat'
      }
    })

    const toggleButton = wrapper.find('[data-test="system-messages-toggle"]')
    expect(toggleButton.text()).toContain('Show System Messages')
    expect(toggleButton.find('.system-toggle-icon').text()).toBe('🙈')
  })

  it('should emit toggle-system-messages when button is clicked', async () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: true,
        messageCount: 5,
        chatTitle: 'Test Chat'
      }
    })

    const toggleButton = wrapper.find('[data-test="system-messages-toggle"]')
    await toggleButton.trigger('click')

    expect(wrapper.emitted('toggle-system-messages')).toBeTruthy()
    expect(wrapper.emitted('toggle-system-messages')).toHaveLength(1)
  })

  it('should display chat title', () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: true,
        messageCount: 5,
        chatTitle: 'My Test Chat'
      }
    })

    expect(wrapper.text()).toContain('My Test Chat')
  })

  it('should display message count', () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: true,
        messageCount: 42,
        chatTitle: 'Test Chat'
      }
    })

    expect(wrapper.text()).toContain('42 messages')
  })

  it('should render back link to chats', () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: true,
        messageCount: 5,
        chatTitle: 'Test Chat'
      },
      global: {
        stubs: {
          RouterLink: {
            template: '<a data-test="back-link"><slot /></a>',
            props: ['to']
          }
        }
      }
    })

    const backLink = wrapper.find('[data-test="back-link"]')
    expect(backLink.exists()).toBe(true)
  })

  it('should render ModelSelector component', () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: true,
        messageCount: 5,
        chatTitle: 'Test Chat',
        showModelSelector: true
      }
    })

    expect(wrapper.find('[data-test="model-selector"]').exists()).toBe(true)
  })

  it('should not render ModelSelector when showModelSelector is false', () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: true,
        messageCount: 5,
        chatTitle: 'Test Chat',
        showModelSelector: false
      }
    })

    expect(wrapper.find('[data-test="model-selector"]').exists()).toBe(false)
  })

  it('should emit model-selected when ModelSelector emits it', async () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: true,
        messageCount: 5,
        chatTitle: 'Test Chat',
        showModelSelector: true
      }
    })

    const modelSelector = wrapper.findComponent({ name: 'ModelSelector' })
    await modelSelector.vm.$emit('model-selected', { id: 'test-model' })

    expect(wrapper.emitted('model-selected')).toBeTruthy()
    expect(wrapper.emitted('model-selected')![0][0]).toEqual({ id: 'test-model' })
  })

  it('should pass correct props to ModelSelector', () => {
    const wrapper = mount(ChatControls, {
      props: {
        showSystemMessages: true,
        messageCount: 5,
        chatTitle: 'Test Chat',
        showModelSelector: true,
        selectedModelId: 'test-model-123'
      }
    })

    const modelSelector = wrapper.findComponent({ name: 'ModelSelector' })
    expect(modelSelector.props('modelValue')).toBe('test-model-123')
    expect(modelSelector.props('showDetails')).toBe(false)
    expect(modelSelector.props('autoSelect')).toBe(true)
  })
})