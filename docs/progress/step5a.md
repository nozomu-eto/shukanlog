# ステップ5a 進捗管理

## T0: 作業前の準備

- [x] git status確認(画像ファイル以外の未コミットの変更なし。stash不要)
- [x] public/ の画像ファイル(favicon.svg・favicon.ico・favicon-16.png・favicon-32.png・apple-touch-icon.png・icon-192.png・icon-512.png・icon-maskable-512.png・og-image.png)が揃っていることを確認
- [x] git fetch origin → origin/feat/ui-settings から feat/finishing ブランチを作成
- [x] docs/progress/step5a.md を作成

## タスク一覧

- [ ] T1: 新規登録画面で、退会の取り消し方法を案内する
- [ ] T2: ファビコンとホーム画面のアイコン
- [ ] T3: ページのタイトル・説明・OGP
- [ ] T4: 検索エンジンに載せないページ
- [ ] T5: robots.txtとサイトマップ
- [ ] T6: CSPとの整合の確認
- [ ] T7: ドキュメント
- [ ] T8: PRの作成

## 判断ログ

### T0

- git status確認: public/ の画像ファイル(未追跡)以外に未コミットの変更は無かった。stashは不要
- 上記の画像ファイルはすべて public/ に揃っていることを確認した
- `git fetch origin` 後、`git checkout -b feat/finishing origin/feat/ui-settings` でブランチを作成した(未追跡の画像ファイルはそのまま引き継がれた)
