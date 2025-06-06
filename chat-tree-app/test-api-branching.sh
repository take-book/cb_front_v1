#!/bin/bash

# APIテストスクリプト - 分岐機能の確認
# 使用前に以下を設定してください：
# - AUTH_TOKEN: 認証トークン
# - CHAT_UUID: テスト用チャットのUUID

AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"
CHAT_UUID="YOUR_CHAT_UUID_HERE"
API_BASE="http://localhost:8000/api/v1"

echo "=== API分岐機能テスト ==="
echo ""

# 1. 現在のツリー構造を確認
echo "1. 現在のツリー構造を取得..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_BASE/chats/$CHAT_UUID/tree" | jq '.'

echo ""
echo "2. 現在のパスを取得..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_BASE/chats/$CHAT_UUID/path" | jq '.'

# 最初のメッセージのUUIDを取得（手動で設定してください）
FIRST_MESSAGE_UUID="FIRST_MESSAGE_UUID_HERE"

echo ""
echo "3. 最初のメッセージを選択 (UUID: $FIRST_MESSAGE_UUID)..."
curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message_uuid\": \"$FIRST_MESSAGE_UUID\"}" \
  "$API_BASE/chats/$CHAT_UUID/select"

echo ""
echo "4. 選択後のパスを確認..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_BASE/chats/$CHAT_UUID/path" | jq '.'

echo ""
echo "5. 選択後のツリー構造を確認（current_node_uuidに注目）..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_BASE/chats/$CHAT_UUID/tree" | jq '.current_node_uuid'

echo ""
echo "6. 新しいメッセージを送信（分岐を作成）..."
# パターン1: contentのみ
curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "これは分岐テストメッセージです"}' \
  "$API_BASE/chats/$CHAT_UUID/messages" | jq '.'

# パターン2: parent_message_uuidを含む（コメントアウト）
# curl -s -X POST \
#   -H "Authorization: Bearer $AUTH_TOKEN" \
#   -H "Content-Type: application/json" \
#   -d "{\"content\": \"これは分岐テストメッセージです\", \"parent_message_uuid\": \"$FIRST_MESSAGE_UUID\"}" \
#   "$API_BASE/chats/$CHAT_UUID/messages" | jq '.'

echo ""
echo "7. 送信後のツリー構造を確認（分岐が作成されているか）..."
curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_BASE/chats/$CHAT_UUID/tree" | jq '.'

echo ""
echo "=== テスト完了 ==="
echo "ツリー構造を確認して、分岐が作成されているかチェックしてください。"