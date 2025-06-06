import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageStream from '../MessageStream.vue'
import MarkdownContent from '../MarkdownContent.vue'
import type { HistoryMessage } from '../../types/api'

// Mock MarkdownContent component
const MockMarkdownContent = {
  template: '<div class="markdown-content">{{ content }}</div>',
  props: ['content']
}

describe('MessageStream', () => {
  const mockMessages: HistoryMessage[] = [
    {
      message_uuid: 'msg-1',
      role: 'user',
      content: 'Hello, how are you?'
    },
    {
      message_uuid: 'msg-2',
      role: 'assistant',
      content: 'I am doing well, thank you for asking!'
    },
    {
      message_uuid: 'msg-3',
      role: 'user',
      content: 'Can you help me with something?'
    }
  ]

  beforeEach(() => {
    // Reset any global state if needed
  })

  it('should render empty state when no messages', () => {
    const wrapper = mount(MessageStream, {
      props: {
        messages: [],
        selectedMessageUuid: null,
        isBranchingMode: false
      },
      global: {
        components: {
          MarkdownContent: MockMarkdownContent
        }
      }
    })

    expect(wrapper.text()).toContain('No conversation yet')
    expect(wrapper.text()).toContain('Send a message to start')
  })

  it('should render messages correctly', () => {
    const wrapper = mount(MessageStream, {
      props: {
        messages: mockMessages,
        selectedMessageUuid: null,
        isBranchingMode: false
      },
      global: {
        components: {
          MarkdownContent: MockMarkdownContent
        }
      }
    })

    expect(wrapper.text()).toContain('Hello, how are you?')
    expect(wrapper.text()).toContain('I am doing well, thank you for asking!')
    expect(wrapper.text()).toContain('Can you help me with something?')
    expect(wrapper.text()).toContain('3 messages')
  })

  it('should show correct role labels', () => {
    const wrapper = mount(MessageStream, {
      props: {
        messages: mockMessages,
        selectedMessageUuid: null,
        isBranchingMode: false
      },
      global: {
        components: {
          MarkdownContent: MockMarkdownContent
        }
      }
    })

    const userLabels = wrapper.findAll('.max-w-\\[80\\%\\]').filter(w => 
      w.text().includes('You')
    )
    const aiLabels = wrapper.findAll('.max-w-\\[80\\%\\]').filter(w => 
      w.text().includes('AI')
    )

    expect(userLabels).toHaveLength(2) // 2 user messages
    expect(aiLabels).toHaveLength(1) // 1 assistant message
  })

  it('should highlight selected message', () => {
    const wrapper = mount(MessageStream, {
      props: {
        messages: mockMessages,
        selectedMessageUuid: 'msg-2',
        isBranchingMode: false
      },
      global: {
        components: {
          MarkdownContent: MockMarkdownContent
        }
      }
    })

    // Find the selected message container
    const messageContainers = wrapper.findAll('.max-w-\\[80\\%\\]')
    const selectedContainer = messageContainers.find(container => 
      container.classes().includes('ring-2') && container.classes().includes('ring-orange-300')
    )

    expect(selectedContainer).toBeTruthy()
    expect(selectedContainer?.text()).toContain('👈 Selected')
  })

  it('should show branching mode indicator', () => {
    const wrapper = mount(MessageStream, {
      props: {
        messages: mockMessages,
        selectedMessageUuid: 'msg-1',
        isBranchingMode: true
      },
      global: {
        components: {
          MarkdownContent: MockMarkdownContent
        }
      }
    })

    expect(wrapper.text()).toContain('🌿 Showing branch from selected message')
  })

  it('should emit select-message event when message button is clicked', async () => {
    const wrapper = mount(MessageStream, {
      props: {
        messages: mockMessages,
        selectedMessageUuid: null,
        isBranchingMode: false
      },
      global: {
        components: {
          MarkdownContent: MockMarkdownContent
        }
      }
    })

    // Find and click a branch button (🌿)
    const branchButtons = wrapper.findAll('button').filter(btn => 
      btn.text().includes('🌿')
    )
    
    expect(branchButtons.length).toBeGreaterThan(0)
    
    await branchButtons[0].trigger('click')
    
    expect(wrapper.emitted('select-message')).toBeTruthy()
    expect(wrapper.emitted('select-message')?.[0]).toEqual(['msg-1'])
  })

  it('should apply correct styling for user vs assistant messages', () => {
    const wrapper = mount(MessageStream, {
      props: {
        messages: mockMessages,
        selectedMessageUuid: null,
        isBranchingMode: false
      },
      global: {
        components: {
          MarkdownContent: MockMarkdownContent
        }
      }
    })

    const messageContainers = wrapper.findAll('.max-w-\\[80\\%\\]')
    
    // First message (user) should be blue and right-aligned
    const userMessage = messageContainers[0]
    expect(userMessage.classes()).toContain('bg-blue-600')
    expect(userMessage.classes()).toContain('text-white')
    
    // Second message (assistant) should be gray and left-aligned
    const assistantMessage = messageContainers[1]
    expect(assistantMessage.classes()).toContain('bg-gray-100')
    expect(assistantMessage.classes()).toContain('text-gray-900')
  })

  it('should show correct message count in header', () => {
    const wrapper = mount(MessageStream, {
      props: {
        messages: mockMessages,
        selectedMessageUuid: null,
        isBranchingMode: false
      },
      global: {
        components: {
          MarkdownContent: MockMarkdownContent
        }
      }
    })

    expect(wrapper.text()).toContain('3 messages')
  })
})