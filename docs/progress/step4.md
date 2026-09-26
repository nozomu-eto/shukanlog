# ステップ4 進捗管理

## T0: 作業前の準備

- [x] git status確認(未コミットの変更なし。stash不要)
- [x] git fetch origin → origin/main が ステップ3の内容(docs/progress/step3.md、src/react-app/routes/app/day-tab.tsx)と、wrangler.jsonのcompatibility_dateが2026-08-18であることを確認
- [x] feat/ui-settings ブランチを作成(origin/main から)
- [x] docs/progress/step4.md を作成

## タスク一覧

- [ ] T1: compatibility_date のルールを直す
- [ ] T2: 記録の楽観的更新を公式の書き方に揃える
- [ ] T3: 期間の移動の共通部品
- [ ] T4: 週タブ
- [ ] T5: 月タブ
- [ ] T6: 日週月の切り替えの確認
- [ ] T7: 設定画面(/app/settings)
- [ ] T8: メールアドレスの変更(/app/settings/email)
- [ ] T9: パスワードの変更(/app/settings/password)
- [ ] T10: 退会の仕組み(サーバー)
- [ ] T11: 退会の画面(/app/settings/withdraw)
- [ ] T12: 退会から30日後の完全削除(定期処理)
- [ ] T13: メール未確認ユーザーの削除(定期処理)
- [ ] T14: 利用規約・プライバシーポリシーのページ(/terms、/privacy)
- [ ] T15: ライセンスのページ(/licenses)
- [ ] T16: 旧資料の片付け
- [ ] T17: 画面の動作確認
- [ ] T18: ドキュメント
- [ ] T19: ステップ5への持ち越し
- [ ] T20: PRの作成

## 判断ログ

### T0

- git status確認: 未コミットの変更なし。stash不要
- `git fetch origin` 後、origin/main(5ca5c0d)に docs/progress/step3.md・src/react-app/routes/app/day-tab.tsx が含まれること、wrangler.json の compatibility_date が 2026-08-18 であることを確認した
- `git checkout -b feat/ui-settings origin/main` でブランチを作成した(worktreeの制約は今回発生しなかった)
