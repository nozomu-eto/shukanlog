# ステップ2 進捗管理

## T0: 作業前の準備

- [x] git status確認(未コミットの変更なし。stash不要)
- [x] git fetch origin → main が origin/feat/foundation の内容を含むことを確認(diffなし)
- [x] feat/data-api ブランチを作成(origin/main から)
- [x] docs/progress/step2.md を作成

## タスク一覧

- [ ] T1: 本番のメール送信先の制限を外す
- [ ] T2: 静的ファイルのヘッダを_headersで付ける
- [ ] T3: CSPのスタイルの方針を決める
- [ ] T4: 使わないコードだけのログインの入口を閉じる
- [ ] T5: react-routerに一本化する
- [ ] T6: 共通の定数と型
- [ ] T7: 日本時間の日付の関数
- [ ] T8: 週・月の期間の計算
- [ ] T9: テーブル定義とマイグレーション
- [ ] T10: 認証が必要なAPIの共通の仕組み
- [ ] T11: 自分の情報と同意のAPI
- [ ] T12: 日ごとの記録を取得するAPI
- [ ] T13: 習慣の記録API
- [ ] T14: カロリー記録のAPI
- [ ] T15: プロフィールのAPI
- [ ] T16: 週・月の集計API
- [ ] T17: 他人のデータに触れないことの横断テスト
- [ ] T18: ドキュメント
- [ ] T19: PRの作成

## 判断ログ

### T0

- git remote(origin)は設定済みで、origin/main は d4ade05(ステップ1のマージ済み内容)を指している。origin/feat/foundation(37b50c9)は main を1つ余分にマージしたコミットが乗っているだけでツリーの差分は無いことを`git diff d4ade05 37b50c9 --stat`で確認した(main が feat/foundation の内容を含むことの確認)
- 未コミットの変更は無かったため stash は行っていない
- 作業ディレクトリは git worktree であり、リポジトリ本体側で `main` ブランチがロックされていたため、`main` をこのworktreeでチェックアウトすることはできなかった。そのため `git checkout -b feat/data-api origin/main` で、ブランチ名 `main` を経由せず直接 origin/main の内容から feat/data-api を作成した(結果は指示にある「main をチェックアウトしてから分岐する」場合と同じコミットになる)
