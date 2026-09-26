# ステップ3 進捗管理

## T0: 作業前の準備

- [x] git status確認(未コミットの変更なし。stash不要)
- [x] git fetch origin → origin/main が ステップ2の内容(docs/progress/step2.md、docs/api.md)を含むことを確認
- [x] feat/ui-day ブランチを作成(origin/main から。worktree で `main` ブランチ自体をチェックアウトできなかったため、ステップ2と同様に `git checkout -b feat/ui-day origin/main` で直接作成した)
- [x] docs/progress/step3.md を作成

## タスク一覧

- [ ] T1: 集計APIで「記録なし」と「0kcal」を区別する
- [ ] T2: テストの新規登録の回数制限を外す
- [ ] T3: 画面の土台(データ取得・認証クライアント・API クライアント)
- [ ] T4: 共通の部品
- [ ] T5: トップページ(/)
- [ ] T6: ログイン(/login)
- [ ] T7: 新規登録(/signup)と Turnstile
- [ ] T8: 確認コードの入力(/verify)
- [ ] T9: パスワードの再設定(/reset、/reset/new)
- [ ] T10: 画面の振り分け
- [ ] T11: 利用規約への同意(/consent)
- [ ] T12: アプリの枠(ヘッダー・日週月の切り替え)
- [ ] T13: 日タブ(記録の表示と保存)
- [ ] T14: カロリーの記録・編集
- [ ] T15: 画面の動作確認
- [ ] T16: ドキュメント
- [ ] T17: 持ち越し事項の整理
- [ ] T18: PRの作成

## 判断ログ

### T0

- git status確認: 未コミットの変更なし。stash不要
- `git fetch origin` 後、origin/main(2f8adf5)に docs/progress/step2.md・docs/api.md が含まれることを確認した(ステップ2の内容を含む)
- worktree のため `main` ブランチ自体をチェックアウトできなかった(他のworktreeでロック中)。ステップ2と同じ対応方針で `git checkout -b feat/ui-day origin/main` を実行した
