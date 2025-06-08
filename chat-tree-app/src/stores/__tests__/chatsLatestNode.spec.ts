import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatsStore } from '../chats'
import type { TreeNode } from '../../types/api'

describe('チャットストア - 最新ノード選択機能', () => {
  let store: ReturnType<typeof useChatsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useChatsStore()
  })

  describe('findLatestLeafNode', () => {
    it('単純な線形会話で最新のリーフノードを正しく選択する', () => {
      const treeStructure: TreeNode = {
        uuid: 'root',
        role: 'user',
        content: 'Hello',
        children: [
          {
            uuid: 'assistant-1',
            role: 'assistant',
            content: 'Hi there!',
            children: [
              {
                uuid: 'user-2',
                role: 'user',
                content: 'How are you?',
                children: [
                  {
                    uuid: 'assistant-2',
                    role: 'assistant',
                    content: 'I am fine!',
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      }

      const latestNode = store.findLatestLeafNode(treeStructure)
      expect(latestNode?.uuid).toBe('assistant-2')
    })

    it('分岐がある場合、メッセージUUIDの辞書順で最新のリーフノードを選択する', () => {
      // UUIDの命名規則: より新しいメッセージほど辞書順で後になる想定
      const treeStructure: TreeNode = {
        uuid: 'msg-001-root',
        role: 'user',
        content: 'Hello',
        children: [
          {
            uuid: 'msg-002-assistant',
            role: 'assistant',
            content: 'Hi there!',
            children: [
              // 古いブランチ（深いが古い）
              {
                uuid: 'msg-003-user-old',
                role: 'user',
                content: 'Old question',
                children: [
                  {
                    uuid: 'msg-004-assistant-old',
                    role: 'assistant',
                    content: 'Old response',
                    children: [
                      {
                        uuid: 'msg-005-user-old-deep',
                        role: 'user',
                        content: 'Very old deep message',
                        children: []
                      }
                    ]
                  }
                ]
              },
              // 新しいブランチ（浅いが新しい）
              {
                uuid: 'msg-010-user-new',
                role: 'user',
                content: 'New question',
                children: [
                  {
                    uuid: 'msg-011-assistant-new',
                    role: 'assistant',
                    content: 'New response',
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      }

      const latestNode = store.findLatestLeafNode(treeStructure)
      // 深度は浅いが、UUIDが新しい方が選択されるべき
      expect(latestNode?.uuid).toBe('msg-011-assistant-new')
    })

    it('同じレベルの複数のリーフノードがある場合、UUIDの辞書順で最新を選択する', () => {
      const treeStructure: TreeNode = {
        uuid: 'msg-001-root',
        role: 'user',
        content: 'Hello',
        children: [
          {
            uuid: 'msg-002-assistant',
            role: 'assistant',
            content: 'Hi there!',
            children: [
              // 同じ深度の複数ブランチ
              {
                uuid: 'msg-003-user-branch-a',
                role: 'user',
                content: 'Branch A',
                children: [
                  {
                    uuid: 'msg-004-assistant-branch-a',
                    role: 'assistant',
                    content: 'Response A',
                    children: []
                  }
                ]
              },
              {
                uuid: 'msg-005-user-branch-b',
                role: 'user',
                content: 'Branch B',
                children: [
                  {
                    uuid: 'msg-006-assistant-branch-b',
                    role: 'assistant',
                    content: 'Response B',
                    children: []
                  }
                ]
              },
              {
                uuid: 'msg-007-user-branch-c',
                role: 'user',
                content: 'Branch C',
                children: [
                  {
                    uuid: 'msg-008-assistant-branch-c',
                    role: 'assistant',
                    content: 'Response C',
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      }

      const latestNode = store.findLatestLeafNode(treeStructure)
      // UUIDが最も新しいブランチが選択されるべき
      expect(latestNode?.uuid).toBe('msg-008-assistant-branch-c')
    })

    it('リーフノードが一つもない場合（ルートのみ）、ルートノードを返す', () => {
      const treeStructure: TreeNode = {
        uuid: 'msg-001-root',
        role: 'user',
        content: 'Hello',
        children: []
      }

      const latestNode = store.findLatestLeafNode(treeStructure)
      expect(latestNode?.uuid).toBe('msg-001-root')
    })

    it('分岐作成シナリオ: 古い深い会話があっても新しい浅い分岐を選択する', () => {
      // 実際の分岐作成シナリオをシミュレート
      const treeStructure: TreeNode = {
        uuid: 'msg-001-initial',
        role: 'user',
        content: 'Initial message',
        children: [
          {
            uuid: 'msg-002-assistant',
            role: 'assistant',
            content: 'Initial response',
            children: [
              // 既存の長い会話チェーン（古いが深い）
              {
                uuid: 'msg-003-user-old-chain',
                role: 'user',
                content: 'Old conversation continues...',
                children: [
                  {
                    uuid: 'msg-004-assistant-old-chain',
                    role: 'assistant',
                    content: 'Old response...',
                    children: [
                      {
                        uuid: 'msg-005-user-old-chain-deep',
                        role: 'user',
                        content: 'Even deeper old message',
                        children: [
                          {
                            uuid: 'msg-006-assistant-old-chain-deep',
                            role: 'assistant',
                            content: 'Deep old response',
                            children: []
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              // 新しく作成された分岐（新しいが浅い）
              {
                uuid: 'msg-020-user-new-branch',
                role: 'user',
                content: 'New branch question',
                children: [
                  {
                    uuid: 'msg-021-assistant-new-branch',
                    role: 'assistant',
                    content: 'Fresh new response',
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      }

      const latestNode = store.findLatestLeafNode(treeStructure)
      // より新しいUUIDを持つ浅い分岐が選択されるべき
      expect(latestNode?.uuid).toBe('msg-021-assistant-new-branch')
    })
  })

  describe('restorePreservedSelection 分岐後の選択復元', () => {
    it('分岐作成後、新しいAI応答ノードを自動選択する', () => {
      // 分岐前の状態をセットアップ
      const preservedNodeUuid = 'msg-002-assistant'
      
      const treeStructure: TreeNode = {
        uuid: 'msg-001-root',
        role: 'user',
        content: 'Hello',
        children: [
          {
            uuid: 'msg-002-assistant',
            role: 'assistant',
            content: 'Hi there!',
            children: [
              {
                uuid: 'msg-003-user-old',
                role: 'user',
                content: 'Old question',
                children: [
                  {
                    uuid: 'msg-004-assistant-old',
                    role: 'assistant',
                    content: 'Old response',
                    children: []
                  }
                ]
              },
              // 新しく作成された分岐
              {
                uuid: 'msg-010-user-new-branch',
                role: 'user',
                content: 'New branch question',
                children: [
                  {
                    uuid: 'msg-011-assistant-new-branch',
                    role: 'assistant',
                    content: 'New AI response',
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      }

      // ストアにデータをセット
      store.chatData = {
        chat_uuid: 'test-chat',
        title: 'Test Chat',
        tree_structure: treeStructure,
        messages: [],
        system_prompt: null
      }

      // 保存された選択を設定
      store.selectNode(preservedNodeUuid)
      store.preserveSelectionForStreaming()

      // preferNewBranch=trueで復元を実行
      const wasRestored = store.restorePreservedSelection(true)

      expect(wasRestored).toBe(true)
      // 新しいAI応答ノードが選択されているべき
      expect(store.selectedNodeUuid).toBe('msg-011-assistant-new-branch')
    })
  })
})