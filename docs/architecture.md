# アーキテクチャ

shukanlog(Cloudflare版)の技術的な構成と、実装上の決定事項をまとめたものです。画面・デザインの仕様は [design.md](design.md)、[week-month-tabs.md](week-month-tabs.md) を参照してください。

## 全体構成

- Cloudflareの`vite-react-template`(React + Vite + Hono + Workers)をベースにしています
- 1つのWorkerが、APIと静的ファイル(SPA)の両方を配信します
  - `/api/` から始まるパスは Hono のAPI
  - それ以外のパスは静的ファイル(ビルドしたReactアプリ)。存在しないパスは `index.html` を返し、クライアント側のReact Routerが404ページを表示する
- `wrangler.json` の `assets.run_worker_first` を `true` にして、すべてのリクエストが必ずWorkerを通るようにしている。これは、静的ファイルの配信にもセキュリティヘッダを付けるための対応(後述)

### ディレクトリ

- `src/react-app/`: フロントエンド。`main.tsx`(エントリーポイント)、`router.tsx`・`routes/`(画面)、`components/`(部品)、`api/`(APIの呼び出し)
- `src/worker/`: Honoのバックエンド。`index.ts`(入口)、`auth/`(Better Authの設定)、`db/`(drizzleのクライアント・スキーマ)、`lib/`(メール送信・Turnstileなど)、`middleware/`、`routes/`
- `src/shared/`: フロントエンドとバックエンドの両方で使うもの
- `styles/`: `tokens.css`(色・文字のCSS変数)、`ui.css`(ページ全体の基本スタイル)
- `migrations/`: D1のマイグレーション(drizzle-kitで生成)
- `test/worker/`: APIのテスト(実際のWorkersランタイム上で実行)
- `test/frontend/`: 画面・部品のテスト(jsdom)

## 認証

[Better Auth](https://www.better-auth.com/)をdrizzleアダプタ経由でD1に接続して使っています。Workerはリクエストごとに別のenv(D1バインディングなど)を受け取るため、Better Authのインスタンスは`createAuth(env)`という関数でリクエストごとに作ります(モジュールスコープの単一インスタンスにはしない)。

### メールアドレスの確認・パスワード再設定(6桁のコード)

メールのリンクではなく、6桁の確認コードで行います。ホーム画面から開いたアプリと、メールアプリで開いたリンクとでブラウザ(タブ)が分かれてしまう問題を避けるためです。Better Authの`emailOTP`プラグインを使い、`overrideDefaultEmailVerification: true`でリンク方式をコード方式に置き換えています。

- 有効期限: 10分(`expiresIn: 600`)
- 誤り試行の上限: 3回(`allowedAttempts: 3`)
- メールアドレスの変更もこのプラグインの`changeEmail`オプションで同じ仕組みが使えることを確認済み(有効化と画面の実装はステップ4で行う)

### レート制限

Better Authの`rateLimit`機能を`storage: "database"`で有効にしています。メモリ保存(既定)だとWorkerのisolateごとにカウンタが分かれ実質効かないためです。IPアドレスは`cf-connecting-ip`ヘッダーから取得するよう設定しています(`advanced.ipAddress.ipAddressHeaders`)。

エンドポイントごとの制限(`customRules`):

| 対象 | 制限 |
|---|---|
| ログイン(`/sign-in/email`) | 60秒に5回 |
| 新規登録(`/sign-up/email`) | 60秒に3回 |
| 確認コードの送信・再送(`/email-otp/send-verification-otp`) | 60秒に1回 |
| コードの検証(`/email-otp/verify-email`) | 60秒に5回 |
| パスワード再設定の確定(`/email-otp/reset-password`) | 60秒に5回 |
| パスワード再設定の要求(`/email-otp/request-password-reset`) | 300秒に3回 |

Workers Rate Limitingバインディング(`ratelimits`)は10秒か60秒しか指定できないため、300秒などの長い制限はBetter Auth側で行っています。`ratelimits`バインディング自体は、API全体への粗い制限として別途用意しています。

### 新規登録のbot対策(Turnstile)

新規登録(`/api/auth/sign-up/email`)のみ、Honoのミドルウェアでリクエストヘッダー(`x-turnstile-token`)のトークンをサーバー側でCloudflareのsiteverify APIに問い合わせて検証しています。フロントエンドにウィジェットを置くだけでは防御にならないため、検証は必ずサーバー側で行います。

## メール送信

`src/worker/lib/mailer/`に、共通のインターフェース(`Mailer`)と3つの実装があります。

- `console`: 標準出力に表示するだけ(開発用)
- `memory`: 配列に記録するだけ(テスト用)
- `cloudflare`: Email Sendingの`send_email`バインディングで実際に送信する(本番用)

`MAIL_TRANSPORT`環境変数で切り替えます。**安全装置**として、`BETTER_AUTH_URL`が`https://`で始まる(=本番)状態で`MAIL_TRANSPORT`が`console`または`memory`の場合は例外を投げるようにしています。本番で開発用の実装が使われてしまうと、確認コードが届かず誰も登録できなくなる上、コードがログに平文で残ってしまうためです。

メールの件名・本文は`docs/legacy/email-templates.md`の文面を`src/worker/lib/mail-templates.ts`のテンプレート関数にしています。

## セキュリティヘッダ

`hono/secure-headers`で、全レスポンスに以下を付けています。

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Content-Security-Policy-Report-Only`(`default-src 'self'`。Turnstileの読み込み元のみ許可。本適用は違反状況を見てから)

静的ファイル(ASSETSバインディング)から返るレスポンスはヘッダーを直接変更できないため、`new Response(assetResponse.body, assetResponse)`で複製してから付けています。ビルドで出力されるハッシュ付きファイル(`/assets/*`)には`Cache-Control: public, max-age=31536000, immutable`も付けています。

## 日付の扱い

このサービスは「今日やったかどうか」を記録するものなので、日付は常に**日本時間(Asia/Tokyo)**基準で扱います。サーバー・クライアントの両方で、UTCのまま日付を丸めない(日本時間の日付境界で「今日」を判定する)ことを徹底します。具体的な実装(共通の日付関数)はステップ2以降で`src/shared/`に追加します。

## 既知の落とし穴と対策

過去のプロジェクトで実際に起きた問題と、その対策です。

1. **`compatibility_date`が古いと未処理のPromise拒否が誤検知される**: Better Authのログイン失敗時に発生する既知の問題(Better Auth issue #10658)。`compatibility_date`を作業日の日付にすることで、互換性フラグ`unhandled_rejection_after_microtask_checkpoint`が有効になり解消する
2. **Better Authのレート制限が実質効かない**: 既定のメモリ保存はWorkerのisolateごとにカウンタが分かれるため。`storage: "database"`にし、IPアドレスは`cf-connecting-ip`から取得する
3. **静的ファイルのレスポンスにヘッダーを付けられない**: ASSETSバインディングから返るレスポンスは直接変更できないため、複製してから付ける
4. **本番でconsole/memoryのメール送信が使われる**: 確認コードが届かない上、ログに平文で残る。本番URL(https://)でconsole/memoryが指定されたら例外を投げる安全装置を入れている
5. **Workers Rate Limitingバインディングのperiodは10秒か60秒のみ**: 長い期間の制限はBetter Auth側のcustomRulesで行う
6. **D1を使うテストでマイグレーションが未適用**: `@cloudflare/vitest-plugin`の`readD1Migrations`/`applyD1Migrations`を、テストのセットアップファイル(`test/worker/apply-migrations.ts`)で呼び出している
7. **Email Sendingで任意の宛先に送るにはPaidプランが必要**: 開発・テストではconsole/memoryを使う
8. **Turnstileはフロントエンドだけでは防御にならない**: サーバー側でsiteverify APIを呼んで検証する
9. **テストが監視モードのままだと終了しない**: `test`スクリプトは`vitest run`(1回だけ実行)にしている
