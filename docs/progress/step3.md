# ステップ3 進捗管理

## T0: 作業前の準備

- [x] git status確認(未コミットの変更なし。stash不要)
- [x] git fetch origin → origin/main が ステップ2の内容(docs/progress/step2.md、docs/api.md)を含むことを確認
- [x] feat/ui-day ブランチを作成(origin/main から。worktree で `main` ブランチ自体をチェックアウトできなかったため、ステップ2と同様に `git checkout -b feat/ui-day origin/main` で直接作成した)
- [x] docs/progress/step3.md を作成

## タスク一覧

- [x] T1: 集計APIで「記録なし」と「0kcal」を区別する
- [x] T2: テストの新規登録の回数制限を外す
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

### T1

- GET /api/summary の `days[].calories` は、`caloriesByDate`(Map)に日付ごとの合計を積む際、その日にカロリー記録が1件でもあれば(合計が0でも)キーが作られる性質を利用し、`caloriesByDate.has(date)` で「記録が1件以上ある日」かどうかを判定するように変更した。記録が無い日は `null`、0kcalを含む記録がある日はその合計(0を含む)を返す
- 平均の計算(`totals.calories.average`)はもともと「記録がある日(calorie_logが1件以上ある日)」だけで算出する実装のままで変更不要だった。0kcalの日もこの「記録がある日」に含まれるため、平均計算に反映されることをテストで確認した
- GET /api/days/:date の `calories`(`{ total, items }` 形式)は、items が空配列かどうかで「記録なし」を判別できる別の形なので、このタスクの対象外(T1の指示にある「現在は0を返している」という問題はsummaryのみに存在していたため)と判断した

### T2

- test/worker/support/auth.ts の signUpAndSignIn に、呼び出しごとに10.x.x.xの範囲でランダムな一意のIPアドレスを発行する randomTestIp() を追加し、新規登録・メール確認・ログインのすべてのリクエストに cf-connecting-ip ヘッダーとして付けるようにした。レート制限のカウンタ自体はIPアドレスごとに分かれる実装(T8で確認済み)のため、利用者ごとに別IPにすることでカウンタが共有されなくなる
- auth-rate-limit.test.ts は指示通り変更していない(同じIP・固定値のままレート制限に達すること・別IPは影響を受けないことを確認し続ける)
- 各テストファイルに残っていた「新規登録レート制限に抵触しないよう呼び出し回数を抑える」旨のコメントを、実態に合わせて整理した(テストの内容・呼び出し回数自体は変更していない)
