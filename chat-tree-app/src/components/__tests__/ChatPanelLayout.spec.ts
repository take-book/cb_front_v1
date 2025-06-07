import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatPanelLayout from '../ChatPanelLayout.vue'

// Mock child components
vi.mock('@/components/ChatTreeView.vue', () => ({
  default: {
    name: 'ChatTreeView',
    template: '<div data-test="chat-tree-view">ChatTreeView</div>',
    props: ['treeStructure', 'selectedNodeUuid', 'currentPath', 'showSystemMessages'],
    emits: ['node-click']
  }
}))

vi.mock('@/components/MessageStream.vue', () => ({
  default: {
    name: 'MessageStream', 
    template: '<div data-test="message-stream">MessageStream</div>',
    props: ['messages', 'selectedMessageUuid', 'isBranchingMode', 'streamingMessage'],
    emits: ['select-message']
  }
}))

vi.mock('@/components/ResizablePanels.vue', () => ({
  default: {
    name: 'ResizablePanels',
    template: '<div data-test="resizable-panels"><slot name="left" /><slot name="right" /></div>',
    emits: ['resize']
  }
}))

describe('ChatPanelLayout', () => {
  const mockTreeStructure = {
    uuid: 'root',
    role: 'system',
    content: 'You are a helpful assistant.',
    children: [
      {
        uuid: 'msg1',
        role: 'user',
        content: 'Hello',
        children: [
          {
            uuid: 'msg2',
            role: 'assistant',
            content: 'Hi there!',
            children: []
          }
        ]
      }
    ]
  }

  const mockMessages = [
    { message_uuid: 'msg1', role: 'user', content: 'Hello' },
    { message_uuid: 'msg2', role: 'assistant', content: 'Hi there!' }
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render loading state', () => {
    const wrapper = mount(ChatPanelLayout, {
      props: {
        isLoading: true,
        error: null,
        treeStructure: null,
        messages: [],
        selectedNodeUuid: null,
        currentPath: [],
        showSystemMessages: true,
        isBranchingMode: false
      }
    })

    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="chat-tree-view"]').exists()).toBe(false)
  })

  it('should render error state', () => {
    const wrapper = mount(ChatPanelLayout, {
      props: {
        isLoading: false,
        error: 'Something went wrong',
        treeStructure: null,
        messages: [],
        selectedNodeUuid: null,
        currentPath: [],
        showSystemMessages: true,
        isBranchingMode: false
      }
    })

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Something went wrong')
    expect(wrapper.find('[data-test="chat-tree-view"]').exists()).toBe(false)
  })

  it('should render empty state when no messages', () => {
    const wrapper = mount(ChatPanelLayout, {
      props: {
        isLoading: false,
        error: null,
        treeStructure: null,
        messages: [],
        selectedNodeUuid: null,
        currentPath: [],
        showSystemMessages: true,
        isBranchingMode: false
      }
    })

    expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="chat-tree-view"]').exists()).toBe(false)
  })

  it('should render chat components when data is available', () => {
    const wrapper = mount(ChatPanelLayout, {
      props: {
        isLoading: false,
        error: null,
        treeStructure: mockTreeStructure,
        messages: mockMessages,
        selectedNodeUuid: 'msg1',
        currentPath: [],
        showSystemMessages: true,
        isBranchingMode: false
      }
    })

    expect(wrapper.find('[data-test="resizable-panels"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="chat-tree-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="message-stream"]').exists()).toBe(true)
  })

  it('should pass correct props to ChatTreeView', () => {
    const wrapper = mount(ChatPanelLayout, {
      props: {
        isLoading: false,
        error: null,
        treeStructure: mockTreeStructure,
        messages: mockMessages,
        selectedNodeUuid: 'msg2',
        currentPath: [],
        showSystemMessages: false,
        isBranchingMode: true
      }
    })

    const chatTreeView = wrapper.findComponent({ name: 'ChatTreeView' })
    expect(chatTreeView.props('treeStructure')).toEqual(mockTreeStructure)
    expect(chatTreeView.props('selectedNodeUuid')).toBe('msg2')
    expect(chatTreeView.props('showSystemMessages')).toBe(false)
  })

  it('should pass correct props to MessageStream', () => {
    const wrapper = mount(ChatPanelLayout, {
      props: {
        isLoading: false,
        error: null,
        treeStructure: mockTreeStructure,
        messages: mockMessages,
        selectedNodeUuid: 'msg2',
        currentPath: [],
        showSystemMessages: true,
        isBranchingMode: true,
        filteredConversationMessages: mockMessages,
        streamingMessage: { 
          id: 'stream-1',
          role: 'assistant' as const,
          content: 'Streaming...',
          isComplete: false,
          timestamp: Date.now()
        }
      }
    })

    const messageStream = wrapper.findComponent({ name: 'MessageStream' })
    expect(messageStream.props('messages')).toEqual(mockMessages)
    expect(messageStream.props('selectedMessageUuid')).toBe('msg2')
    expect(messageStream.props('isBranchingMode')).toBe(true)
    expect(messageStream.props('streamingMessage')).toEqual(expect.objectContaining({
      content: 'Streaming...',
      isComplete: false
    }))
  })

  it('should emit node-click when ChatTreeView emits it', async () => {
    const wrapper = mount(ChatPanelLayout, {
      props: {
        isLoading: false,
        error: null,
        treeStructure: mockTreeStructure,
        messages: mockMessages,
        selectedNodeUuid: 'msg1',
        currentPath: [],
        showSystemMessages: true,
        isBranchingMode: false
      }
    })

    const chatTreeView = wrapper.findComponent({ name: 'ChatTreeView' })
    await chatTreeView.vm.$emit('node-click', 'msg2')

    expect(wrapper.emitted('node-click')).toBeTruthy()
    expect(wrapper.emitted('node-click')![0][0]).toBe('msg2')
  })

  it('should emit select-message when MessageStream emits it', async () => {
    const wrapper = mount(ChatPanelLayout, {
      props: {
        isLoading: false,
        error: null,
        treeStructure: mockTreeStructure,
        messages: mockMessages,
        selectedNodeUuid: 'msg1',
        currentPath: [],
        showSystemMessages: true,
        isBranchingMode: false
      }
    })

    const messageStream = wrapper.findComponent({ name: 'MessageStream' })
    await messageStream.vm.$emit('select-message', 'msg1')

    expect(wrapper.emitted('select-message')).toBeTruthy()
    expect(wrapper.emitted('select-message')![0][0]).toBe('msg1')
  })

  it('should handle mode indicator display correctly', () => {
    const wrapper = mount(ChatPanelLayout, {
      props: {
        isLoading: false,
        error: null,
        treeStructure: mockTreeStructure,
        messages: mockMessages,
        selectedNodeUuid: 'msg1',
        currentPath: [],
        showSystemMessages: true,
        isBranchingMode: true
      }
    })

    expect(wrapper.text()).toContain('Branching mode')
    expect(wrapper.text()).toContain('Your next message will create a new conversation branch')
  })

  it('should handle continue mode display correctly', () => {
    const wrapper = mount(ChatPanelLayout, {
      props: {
        isLoading: false,
        error: null,
        treeStructure: mockTreeStructure,
        messages: mockMessages,
        selectedNodeUuid: 'msg2',
        currentPath: [],
        showSystemMessages: true,
        isBranchingMode: false
      }
    })

    expect(wrapper.text()).toContain('Continue mode')
    expect(wrapper.text()).toContain('Your next message will continue the conversation normally')
  })
})