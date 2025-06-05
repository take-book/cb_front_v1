import { defineStore } from 'pinia'
import { chatsApi } from '@/api/chats'
import type {
  ChatListItem,
  ChatMetadataResponse,
  HistoryMessage,
  MessageResponse,
  ChatCreateResponse,
  TreeStructureResponse,
  TreeNode
} from '@/types/api'

export const useChatsStore = defineStore('chats', {
  state: () => ({
    chats: [] as ChatListItem[],
    currentChat: null as ChatMetadataResponse | null,
    currentChatHistory: [] as HistoryMessage[],
    currentPath: [] as string[],
    currentTreeStructure: null as TreeStructureResponse | null,
    currentPage: 1,
    totalPages: 1,
    loading: false,
    error: null as string | null
  }),

  actions: {
    async fetchRecentChats(page = 1, limit = 20) {
      this.loading = true
      this.error = null
      
      try {
        const response = await chatsApi.getRecentChats({ page, limit })
        this.chats = response.items
        this.currentPage = response.page
        this.totalPages = response.pages
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch chats'
        this.chats = []
      } finally {
        this.loading = false
      }
    },

    async searchChats(query: string, page = 1, limit = 20) {
      this.loading = true
      this.error = null
      
      try {
        const response = await chatsApi.getChats({ q: query, page, limit })
        this.chats = response.items
        this.currentPage = response.page
        this.totalPages = response.pages
      } catch (error: any) {
        this.error = error.message || 'Failed to search chats'
        this.chats = []
      } finally {
        this.loading = false
      }
    },

    async createChat(initialMessage?: string): Promise<ChatCreateResponse> {
      const data = initialMessage ? { initial_message: initialMessage } : {}
      return await chatsApi.createChat(data)
    },

    async loadChat(chatUuid: string) {
      this.loading = true
      this.error = null
      
      try {
        const [metadata, history, path, treeStructure] = await Promise.all([
          chatsApi.getChatMetadata(chatUuid),
          chatsApi.getHistory(chatUuid),
          chatsApi.getPath(chatUuid),
          chatsApi.getTreeStructure(chatUuid)
        ])
        
        this.currentChat = metadata
        this.currentChatHistory = history.messages
        this.currentPath = path.path
        this.currentTreeStructure = treeStructure
      } catch (error: any) {
        this.error = error.message || 'Failed to load chat'
        this.currentChat = null
        this.currentChatHistory = []
        this.currentPath = []
        this.currentTreeStructure = null
      } finally {
        this.loading = false
      }
    },

    async sendMessage(content: string): Promise<MessageResponse> {
      if (!this.currentChat) {
        throw new Error('No active chat')
      }

      // Optimistically add user message to UI immediately
      const tempUserUuid = `temp-user-${Date.now()}`
      const userMessage: HistoryMessage = {
        message_uuid: tempUserUuid,
        role: 'user',
        content
      }
      this.currentChatHistory.push(userMessage)

      try {
        const response = await chatsApi.sendMessage(this.currentChat.chat_uuid, { content })
        
        // Reload the entire chat state to ensure consistency and get the real tree structure
        const [history, path, treeStructure] = await Promise.all([
          chatsApi.getHistory(this.currentChat.chat_uuid),
          chatsApi.getPath(this.currentChat.chat_uuid),
          chatsApi.getTreeStructure(this.currentChat.chat_uuid)
        ])
        
        this.currentChatHistory = history.messages
        this.currentPath = path.path
        this.currentTreeStructure = treeStructure
        
        return response
      } catch (error) {
        // Remove optimistically added user message on error
        this.currentChatHistory = this.currentChatHistory.filter(m => m.message_uuid !== tempUserUuid)
        throw error
      }
    },

    async deleteChat(chatUuid: string) {
      await chatsApi.deleteChat(chatUuid)
      this.chats = this.chats.filter(chat => chat.chat_uuid !== chatUuid)
      
      if (this.currentChat?.chat_uuid === chatUuid) {
        this.currentChat = null
        this.currentChatHistory = []
        this.currentPath = []
        this.currentTreeStructure = null
      }
    },

    async updateChat(chatUuid: string, title?: string, systemPrompt?: string) {
      await chatsApi.updateChat(chatUuid, { title, system_prompt: systemPrompt })
      
      if (this.currentChat?.chat_uuid === chatUuid && title) {
        this.currentChat.title = title
      }
      
      const chatInList = this.chats.find(c => c.chat_uuid === chatUuid)
      if (chatInList && title) {
        chatInList.title = title
      }
    },

    async selectNode(messageUuid: string) {
      if (!this.currentChat) {
        throw new Error('No active chat')
      }
      
      await chatsApi.selectNode(this.currentChat.chat_uuid, { message_uuid: messageUuid })
      
      // Update path, tree structure, and history to reflect the new selection
      const [path, treeStructure, history] = await Promise.all([
        chatsApi.getPath(this.currentChat.chat_uuid),
        chatsApi.getTreeStructure(this.currentChat.chat_uuid),
        chatsApi.getHistory(this.currentChat.chat_uuid)
      ])
      this.currentPath = path.path
      this.currentTreeStructure = treeStructure
      this.currentChatHistory = history.messages
    },

    async retryMessage(messageId: string): Promise<MessageResponse> {
      if (!this.currentChat) {
        throw new Error('No active chat')
      }
      
      const response = await chatsApi.retryMessage(this.currentChat.chat_uuid, messageId)
      
      // Update message in history
      const messageIndex = this.currentChatHistory.findIndex(m => m.message_uuid === messageId)
      if (messageIndex !== -1) {
        this.currentChatHistory[messageIndex].content = response.content
      }
      
      return response
    },

    clearCurrentChat() {
      this.currentChat = null
      this.currentChatHistory = []
      this.currentPath = []
      this.currentTreeStructure = null
    }
  }
})