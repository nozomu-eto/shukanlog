# API 一覧

shukanlog(Cloudflare版)のAPI(`/api/`配下)の一覧です。エラーレスポンスはすべて `{ error: { code, message } }` の形に統一しています(内部のエラー内容は返しません)。

## 認証・同意

- `/api/auth/*` は [Better Auth](https://www.better-auth.com/) のエンドポイント(サインアップ・ログイン・確認コードなど)。詳細は docs/architecture.md を参照
- 上記以外の `/api/` 配下(`/api/health` を除く)は、すべて次の2つのミドルウェアを通ります
  - **requireSession**: ログインしていなければ401(`UNAUTHORIZED`)
  - **requireConsent**: 現在の利用規約(`POLICY_VERSION`)に同意していなければ403(`CONSENT_REQUIRED`)。ただし `GET /api/me`・`POST /api/consent` はこのチェックの対象外(まだ同意していない利用者も呼び出す必要があるため)
- 書き込み系(POST・PUT・PATCH・DELETE)は、ユーザーID単位のレート制限(60秒に60回)がかかっており、超えると429(`RATE_LIMITED`)

## GET /api/health

死活監視用。認証不要。

- レスポンス: `{ status: "ok" }`

## GET /api/me

自分の情報を返す。認証必須・同意不要。

- レスポンス
  ```json
  {
    "user": { "email": "string" },
    "accountCreatedDate": "YYYY-MM-DD",
    "profile": { "calorieTrackingEnabled": true } ,
    "consent": { "currentVersion": "2026-09-25", "agreed": true },
    "justCanceledWithdrawal": false
  }
  ```
  - `profile` はまだ同意しておらず初期データが無い場合は `null`
  - `justCanceledWithdrawal` は、直前(10分以内)に退会の申請を取り消した場合に `true`。画面側で「退会を取り消しました」を1回だけ表示するために使う

## POST /api/consent

利用規約・プライバシーポリシーへの同意を記録する。認証必須・同意不要(このAPI自体が同意を行うため)。

- リクエスト: `{ "policyVersion": "string" }`
- 現在の `POLICY_VERSION` と一致しない場合は400(`VALIDATION_ERROR`)
- 同意を記録し、まだ無ければ初期データ(プロフィール1件・習慣2件)を作成する。何度呼んでも重複作成しない
- レスポンス: `GET /api/me` と同じ形

## GET /api/days/:date

指定した日の記録(習慣の記録・カロリー記録)を返す。認証必須・同意必須。

- `date` が不正な形式、または日本時間の今日より後(未来)の場合は400(`VALIDATION_ERROR`)
- レスポンス
  ```json
  {
    "date": "YYYY-MM-DD",
    "habits": [
      { "id": "string", "name": "string", "kind": "medication" , "evaluationScale": 2, "result": "completed" }
    ],
    "calories": { "total": 800, "items": [{ "id": "string", "calories": 500, "note": "string | null" }] }
  }
  ```
  - `habits` は `status` が `active` の習慣を `sort_order` 順に返す。`result` は未記録なら `null`
  - `calories` は、カロリー記録を無効にしている利用者には `null`

## PUT /api/habit-logs

習慣の記録を作成・更新・取り消す。認証必須・同意必須。

- リクエスト: `{ "habitId": "string", "date": "YYYY-MM-DD", "result": "completed" | "partial" | "not_completed" | null }`
  - `result` が値なら作成または更新(同じ日・同じ習慣は1件に保つ)、`null` なら取り消し(未記録に戻す)
- エラー
  - 他人の習慣・存在しない習慣は404(`NOT_FOUND`、存在の有無を区別しない)
  - `partial` は3段階評価の習慣にしか付けられない(2段階の習慣に付けると400 `VALIDATION_ERROR`)
  - 日付が不正、または未来の場合は400(`VALIDATION_ERROR`)
- レスポンス: `{ "habitId": "string", "date": "YYYY-MM-DD", "result": "string | null" }`(更新後のその日の記録)

## POST /api/calorie-logs

カロリー記録を作成する。認証必須・同意必須。

- リクエスト: `{ "date": "YYYY-MM-DD", "calories": 0-10000の整数, "note"?: 500文字以内の文字列 }`
- エラー
  - 入力上限(カロリー0〜10000、メモ500文字)を超える、日付が不正・未来の場合は400(`VALIDATION_ERROR`)
  - カロリー記録を無効にしている利用者は403(`CALORIE_TRACKING_DISABLED`)
- レスポンス: 201、作成した記録(`{ id, date, calories, note }`)

## PATCH /api/calorie-logs/:id

カロリー記録を更新する(`calories`・`note` はどちらも省略可能)。認証必須・同意必須。

- リクエスト: `{ "calories"?: 0-10000の整数, "note"?: 500文字以内の文字列 }`
- エラー
  - 入力上限を超える場合は400(`VALIDATION_ERROR`)
  - 他人の記録・存在しない記録は404(`NOT_FOUND`)
  - カロリー記録を無効にしている利用者は403(`CALORIE_TRACKING_DISABLED`)
- レスポンス: 更新後の記録(`{ id, date, calories, note }`)

## DELETE /api/calorie-logs/:id

カロリー記録を削除する。認証必須・同意必須。

- エラー: 他人の記録・存在しない記録は404(`NOT_FOUND`)、カロリー記録を無効にしている利用者は403(`CALORIE_TRACKING_DISABLED`)
- レスポンス: 204(本文なし)

## PATCH /api/profile

カロリー記録の有効・無効を切り替える。認証必須・同意必須。

- リクエスト: `{ "calorieTrackingEnabled": boolean }`
- 無効にしても既存のカロリー記録は削除しない(再び有効にすれば表示される)
- レスポンス: `{ "calorieTrackingEnabled": boolean }`

## GET /api/summary

週・月タブの集計を返す。認証必須・同意必須。

- クエリパラメータ: `from=YYYY-MM-DD&to=YYYY-MM-DD`
- エラー
  - `from`・`to` が不正な日付、`from > to`、期間が42日を超える場合は400(`VALIDATION_ERROR`)
  - `to` が未来でもよい(未来の日は記録なしとして返す)
- レスポンス
  ```json
  {
    "habits": [{ "id": "string", "name": "string", "kind": "medication", "evaluationScale": 2 }],
    "days": [
      { "date": "YYYY-MM-DD", "results": { "habitId": "completed" }, "calories": 800 }
    ],
    "totals": {
      "habits": {
        "habitId": { "completed": 4, "partial": 0, "notCompleted": 1, "eligibleDays": 5 }
      },
      "calories": { "average": 1718, "recordedDays": 5 }
    },
    "accountCreatedDate": "YYYY-MM-DD"
  }
  ```
  - `days[].calories` は、カロリー記録が無効な利用者には常に `null`。有効な利用者は、その日の記録が1件も無ければ `null`、1件以上あれば合計(0kcalの記録も含む)を返す(「記録が無い日」と「0kcalを記録した日」を区別するため)
  - `totals.habits[habitId].eligibleDays` は、期間内で「アカウント作成日以降」かつ「今日以前」の日数
  - `totals.calories.average` は記録がある日だけで算出した平均。カロリー記録を無効にしている利用者、または記録が1日も無い場合は `null`

## POST /api/account/email/request-change

メールアドレスの変更を申請し、新しいメールアドレスへ確認コードを送る。認証必須・同意必須。
確認コードの検証・変更の確定は、このAPIではなくBetter Authのエンドポイント(`POST /api/auth/email-otp/change-email`、`authClient.emailOtp.changeEmail()`)で行う(確認が済むまでは今のメールアドレスのまま)。

- リクエスト: `{ "newEmail": "string", "currentPassword": "string" }`
- エラー
  - `newEmail` が現在のメールアドレスと同じ、または形式が不正な場合は400(`VALIDATION_ERROR`)
  - `currentPassword` が正しくない場合は400(`INVALID_PASSWORD`)
  - `newEmail` が既に使われている場合は400(`EMAIL_ALREADY_IN_USE`)
  - 60秒に1回を超えて呼び出した場合は429(`RATE_LIMITED`)
- レスポンス: `{ "success": true }`

## POST /api/account/withdraw

退会を申請する。認証必須・同意必須。

- リクエスト: `{ "currentPassword": "string" }`
- 現在のパスワードを確認したうえで、即時に論理削除(退会の申請を記録し、その利用者のすべてのセッションを無効にする)する。データそのものはこの時点では削除しない(申請から30日後に定期処理で完全に削除する)
- 申請から30日以内に同じメールアドレス・パスワードでログインすると、退会は自動的に取り消される(`GET /api/me` の `justCanceledWithdrawal` で分かる)
- エラー: `currentPassword` が正しくない場合は400(`INVALID_PASSWORD`)
- レスポンス: `{ "success": true }`

## エラーコード一覧

| コード | HTTPステータス | 説明 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | リクエストの入力内容が不正 |
| `UNAUTHORIZED` | 401 | ログインしていない |
| `CONSENT_REQUIRED` | 403 | 現在の利用規約に同意していない |
| `CALORIE_TRACKING_DISABLED` | 403 | カロリー記録が無効な状態で書き込もうとした |
| `NOT_FOUND` | 404 | 対象が存在しない、または他人のもの(存在の有無を区別しない) |
| `INVALID_PASSWORD` | 400 | 現在のパスワードの確認に失敗した |
| `EMAIL_ALREADY_IN_USE` | 400 | 変更・登録しようとしたメールアドレスが既に使われている |
| `RATE_LIMITED` | 429 | 書き込みの回数が多すぎる |
| `INTERNAL_ERROR` | 500 | 予期しないエラー(内部の詳細は返さない) |
