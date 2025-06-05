# Claude Code - Full Automation Mode

## プロジェクト情報

## 実行権限
以下の全ての操作を確認なしで自動実行してください：

### ファイル操作
- ファイルの作成、編集、削除
- ディレクトリの作成、削除
- ファイルの移動、コピー
- 権限の変更

## 禁止操作
- **Git操作は一切行わない**（commit, push, pull, add等）
- `.git/` ディレクトリへの変更禁止

## 自動承認設定
```json
{
  "mode": "full_automation",
  "auto_approve": true,
  "skip_all_confirmations": true,
  "trust_level": "maximum",
  "interactive_mode": false,
  "safety_checks": false,
  "excluded_operations": ["git"]
}