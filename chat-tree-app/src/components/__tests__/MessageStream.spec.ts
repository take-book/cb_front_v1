import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MessageStream from '../MessageStream.vue'
import MarkdownContent from '../MarkdownContent.vue'
import type { HistoryMessage } from '../../types/api'

// Mock MarkdownContent component
const MockMarkdownContent = {
  template: '<div class="markdown-content">{{ content }}</div>',
  props: ['content']
}

// Mock the chats API
vi.mock('../../api/chats', () => ({
  chatApi: {
    getCompleteChat: vi.fn(),
    sendMessage: vi.fn(),
    createChat: vi.fn(),
    updateChat: vi.fn(),
    deleteChat: vi.fn(),
    getRecentChats: vi.fn(),
    getChats: vi.fn()
  }
}))

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

  const mockMessagesWithSystem: HistoryMessage[] = [
    {
      message_uuid: 'system-1',
      role: 'system',
      content: 'You are a helpful assistant.'
    },
    ...mockMessages
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
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

  describe('System Message Filtering', () => {
    it('should show system messages when they are included in messages prop', () => {
      const wrapper = mount(MessageStream, {
        props: {
          messages: mockMessagesWithSystem,
          selectedMessageUuid: null,
          isBranchingMode: false
        },
        global: {
          components: {
            MarkdownContent: MockMarkdownContent
          }
        }
      })

      expect(wrapper.text()).toContain('You are a helpful assistant.')
      expect(wrapper.text()).toContain('4 messages')
    })

    it('should not show system messages when they are filtered out', () => {
      const wrapper = mount(MessageStream, {
        props: {
          messages: mockMessages, // No system messages
          selectedMessageUuid: null,
          isBranchingMode: false
        },
        global: {
          components: {
            MarkdownContent: MockMarkdownContent
          }
        }
      })

      expect(wrapper.text()).not.toContain('You are a helpful assistant.')
      expect(wrapper.text()).toContain('3 messages')
    })

    it('should handle empty message list after filtering', () => {
      const systemOnlyMessages: HistoryMessage[] = [
        {
          message_uuid: 'system-1',
          role: 'system',
          content: 'You are a helpful assistant.'
        }
      ]

      const wrapper = mount(MessageStream, {
        props: {
          messages: [], // Filtered out system messages
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

    it('should not show system message in role labels', () => {
      const wrapper = mount(MessageStream, {
        props: {
          messages: mockMessages, // Should not contain system messages
          selectedMessageUuid: null,
          isBranchingMode: false
        },
        global: {
          components: {
            MarkdownContent: MockMarkdownContent
          }
        }
      })

      // Should only show "You" and "AI" labels, no "System" labels
      expect(wrapper.text()).not.toContain('System')
      
      const userLabels = wrapper.findAll('.max-w-\\[80\\%\\]').filter(w => 
        w.text().includes('You')
      )
      const aiLabels = wrapper.findAll('.max-w-\\[80\\%\\]').filter(w => 
        w.text().includes('AI')
      )

      expect(userLabels).toHaveLength(2) // 2 user messages
      expect(aiLabels).toHaveLength(1) // 1 assistant message
    })
  })
})