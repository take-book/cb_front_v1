import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ResizablePanels from '../ResizablePanels.vue'

describe('ResizablePanels', () => {
  let wrapper: any
  
  beforeEach(() => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      writable: true
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  it('should render with default panel widths', () => {
    wrapper = mount(ResizablePanels, {
      slots: {
        left: '<div data-test="left-content">Left Panel</div>',
        right: '<div data-test="right-content">Right Panel</div>'
      }
    })

    expect(wrapper.find('[data-test="left-content"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="right-content"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="resize-divider"]').exists()).toBe(true)
  })

  it('should start resizing when mouse down on divider', async () => {
    wrapper = mount(ResizablePanels, {
      slots: {
        left: '<div>Left</div>',
        right: '<div>Right</div>'
      }
    })

    const divider = wrapper.find('[data-test="resize-divider"]')
    await divider.trigger('mousedown', { clientX: 400 })

    expect(wrapper.vm.isResizing).toBe(true)
  })

  it('should restore saved panel widths from localStorage', () => {
    vi.mocked(localStorage.getItem)
      .mockReturnValueOnce('350') // left width
      .mockReturnValueOnce('600') // right width

    wrapper = mount(ResizablePanels, {
      slots: {
        left: '<div>Left</div>',
        right: '<div>Right</div>'
      }
    })

    expect(wrapper.vm.leftPanelWidth).toBe(350)
    expect(wrapper.vm.rightPanelWidth).toBe(600)
  })

  it('should constrain panel widths to minimum values', () => {
    wrapper = mount(ResizablePanels, {
      props: {
        minLeftWidth: 250,
        minRightWidth: 400
      },
      slots: {
        left: '<div>Left</div>',
        right: '<div>Right</div>'
      }
    })

    // Try to set widths below minimum
    wrapper.vm.leftPanelWidth = 100
    wrapper.vm.rightPanelWidth = 200

    expect(wrapper.vm.leftPanelWidth).toBeGreaterThanOrEqual(250)
    expect(wrapper.vm.rightPanelWidth).toBeGreaterThanOrEqual(400)
  })

  it('should emit resize events when panel widths change', async () => {
    wrapper = mount(ResizablePanels, {
      slots: {
        left: '<div>Left</div>',
        right: '<div>Right</div>'
      }
    })

    wrapper.vm.leftPanelWidth = 400
    wrapper.vm.rightPanelWidth = 500

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('resize')).toBeTruthy()
    expect(wrapper.emitted('resize')[0][0]).toEqual({
      leftWidth: 400,
      rightWidth: 500
    })
  })

  it('should save panel widths to localStorage when resizing stops', async () => {
    wrapper = mount(ResizablePanels, {
      slots: {
        left: '<div>Left</div>',
        right: '<div>Right</div>'
      }
    })

    const divider = wrapper.find('[data-test="resize-divider"]')
    await divider.trigger('mousedown', { clientX: 400 })
    
    // Simulate mouse up
    const mouseUpEvent = new MouseEvent('mouseup')
    document.dispatchEvent(mouseUpEvent)

    expect(localStorage.setItem).toHaveBeenCalledWith('chatview-left-panel-width', expect.any(String))
    expect(localStorage.setItem).toHaveBeenCalledWith('chatview-right-panel-width', expect.any(String))
  })

  it('should handle window resize', () => {
    wrapper = mount(ResizablePanels, {
      slots: {
        left: '<div>Left</div>',
        right: '<div>Right</div>'
      }
    })

    // Mock large panel widths that exceed window
    wrapper.vm.leftPanelWidth = 800
    wrapper.vm.rightPanelWidth = 800

    // Simulate window resize
    window.innerWidth = 1000
    window.dispatchEvent(new Event('resize'))

    // Panels should be adjusted to fit
    expect(wrapper.vm.leftPanelWidth + wrapper.vm.rightPanelWidth).toBeLessThanOrEqual(1000)
  })
})