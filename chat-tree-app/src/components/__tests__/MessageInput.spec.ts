import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageInput from '../MessageInput.vue'

describe('MessageInput.vue', () => {
  it('should emit submit event with message', async () => {
    const wrapper = mount(MessageInput, {
      props: {
        modelValue: '',
        isLoading: false,
        isBranchingMode: false
      }
    })

    // Type a message
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Test message')
    
    // Verify message is set
    expect(wrapper.vm.localMessage).toBe('Test message')
    
    // Submit the form
    await wrapper.find('form').trigger('submit.prevent')
    
    // Verify submit event was emitted with correct message
    const submitEvents = wrapper.emitted('submit')
    expect(submitEvents).toHaveLength(1)
    expect(submitEvents[0]).toEqual(['Test message'])
    
    // Message should still be in component (parent will clear via v-model)
    expect(wrapper.vm.localMessage).toBe('Test message')
  })

  it('should clear message when parent updates modelValue to empty', async () => {
    const wrapper = mount(MessageInput, {
      props: {
        modelValue: 'Test message',
        isLoading: false,
        isBranchingMode: false
      }
    })

    // Verify message is set from prop
    expect(wrapper.vm.localMessage).toBe('Test message')
    
    // Parent clears the message
    await wrapper.setProps({ modelValue: '' })
    
    // Verify message is cleared
    expect(wrapper.vm.localMessage).toBe('')
  })

  it('should not submit empty message', async () => {
    const wrapper = mount(MessageInput, {
      props: {
        modelValue: '',
        isLoading: false
      }
    })

    // Try to submit empty form
    await wrapper.find('form').trigger('submit.prevent')
    
    // Verify no events were emitted
    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('should not submit when disabled', async () => {
    const wrapper = mount(MessageInput, {
      props: {
        modelValue: 'Test message',
        isLoading: true // This makes it disabled
      }
    })

    // Try to submit when disabled
    await wrapper.find('form').trigger('submit.prevent')
    
    // Verify no events were emitted
    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('should show correct button text for branching mode', () => {
    const wrapper = mount(MessageInput, {
      props: {
        modelValue: '',
        isBranchingMode: true
      }
    })

    const button = wrapper.find('button[type="submit"]')
    expect(button.text()).toContain('Branch')
  })

  it('should show correct button text for normal mode', () => {
    const wrapper = mount(MessageInput, {
      props: {
        modelValue: '',
        isBranchingMode: false
      }
    })

    const button = wrapper.find('button[type="submit"]')
    expect(button.text()).toContain('Send')
  })
})