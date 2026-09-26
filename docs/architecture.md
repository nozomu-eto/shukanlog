# アーキテクチャ

shukanlog(Cloudflare版)の技術的な構成と、実装上の決定事項をまとめたものです。画面・デザインの仕様は [design.md](design.md)、[week-month-tabs.md](week-month-tabs.md) を参照してください。

## 全体構成

- Cloudflareの`vite-react-template`(React + Vite + Hono + Workers)をベースにしています
- 1つのWorkerが、APIと静的ファイル(SPA)の両方を配信します
  - `/api/` から始まるパスは Hono のAPI(Workerが処理する)
  - それ以外のパスは静的ファイル(ビルドしたReactアプリ)。Cloudflareのアセット配信がWorkerを経由せず直接返す。存在しないパスは `index.html` を返し、クライアント側のReact Routerが404ページを表示する
- `wrangler.json` の `assets.run_worker_first` は `["/api/*"]` にしている。`/api/` 配下だけWorkerを必ず通し、静的ファイルはWorkerを経由しない(日本語フォントなど細かいファイルを含む1回の画面表示でWorkerが何十回も動いてしまうのを避けるため)。静的ファイルのヘッダーは`public/_headers`で付ける(後述)

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
- `cloudflare`: Email Sendingの`send_email`バインディングで実際に送信する(本番用)。バインディングは`destination_address`を指定せず(指定すると検証済みの1つの宛先にしか送れなくなる)、`allowed_sender_addresses: ["noreply@shukanlog.com"]`で送信元のみを限定している

`MAIL_TRANSPORT`環境変数で切り替えます。**安全装置**として、`BETTER_AUTH_URL`が`https://`で始まる(=本番)状態で`MAIL_TRANSPORT`が`console`または`memory`の場合は例外を投げるようにしています。本番で開発用の実装が使われてしまうと、確認コードが届かず誰も登録できなくなる上、コードがログに平文で残ってしまうためです。

メールの件名・本文は`docs/legacy/email-templates.md`の文面を`src/worker/lib/mail-templates.ts`のテンプレート関数にしています。

## セキュリティヘッダ

`/api/`配下は`hono/secure-headers`(`src/worker/middleware/security-headers.ts`)、それ以外の静的ファイルは`public/_headers`で、それぞれ以下のヘッダーを付けています。値は`src/shared/security-headers.ts`に一元化しており、`test/frontend/security-headers-file.test.ts`で`public/_headers`の内容がこの値と一致することを確認しています。

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Content-Security-Policy-Report-Only`(`default-src 'self'`。Turnstileの読み込み元のみ許可。本適用は違反状況を見てから)

ビルドで出力されるハッシュ付きファイル(`/assets/*`)には`public/_headers`で`Cache-Control: public, max-age=31536000, immutable`も付けています。

### CSPのスタイルの方針

style要素・外部CSSは`style-src-elem 'self'`のみ許可し、style属性は`style-src-attr 'unsafe-inline'`で許可しています。Reactのstyle属性はインラインスタイルとして扱われCSPの強制適用時に違反になるため、固定の見た目は必ずCSSのクラスで書き、style属性はグラフの棒の高さのような実行時の計算でしか決まらない値にのみ使う運用ルールにしています(AGENTS.md参照)。

## 使わないエンドポイントを閉じる

Better Authの`emailOTP`プラグインを入れると、メールのコードだけでログインできるエンドポイント(`POST /api/auth/sign-in/email-otp`)も有効になりますが、shukanlogではメールアドレス・パスワードでのログインのみを使うため使いません。`src/worker/middleware/disabled-auth-endpoints.ts`で、Better Authに処理を渡す前にHonoのミドルウェアで404を返して閉じています。

## テーブル構成

`src/worker/db/schema/`にdrizzleで定義しています。IDは`crypto.randomUUID()`で発行する文字列、日時はUNIXミリ秒の整数、日付は`YYYY-MM-DD`形式の文字列です。すべてのテーブルの`user_id`は`user.id`を参照し、`onDelete: "cascade"`にしているため、利用者を削除すると関連する行もすべて連動して削除されます(退会の物理削除の実装自体はステップ4)。

| テーブル | 内容 | 一意制約・索引 |
|---|---|---|
| `profile`(`user_id`が主キー) | 利用者ごとの設定(カロリー記録の有効/無効。既定true) | - |
| `habit` | 習慣(服薬・運動など)。`kind`・`evaluation_scale`・`status`・`sort_order`を持つ | `(user_id, kind)`一意(初期データの二重作成防止) |
| `habit_log` | 習慣の日別の記録。未記録は行そのものが無い状態で表す | `(habit_id, record_date)`一意、`(user_id, record_date)`索引 |
| `calorie_log` | カロリー記録。1日に複数件記録できる | `(user_id, record_date)`索引 |
| `terms_agreement` | 利用規約・プライバシーポリシーへの同意 | `(user_id, policy_version)`一意 |

初期データ(習慣2件・プロフィール1件)は、利用規約への同意時(`POST /api/consent`)に、`onConflictDoNothing`を使ったD1バッチ(`db.batch()`)で作成します。既にある行は無視されるため、同意を何度呼んでも重複作成せず、一部だけ欠けている状態でも欠けている分だけ補完されます。

## 認証・同意が必要なAPIの共通の仕組み

`src/worker/routes/index.ts`の`apiRouter`(`/api`にマウント)が、`/api/health`・`/api/auth/*`以外のAPIをまとめています。

- **requireSession**(`src/worker/middleware/require-session.ts`): Better Authのセッション(`auth.api.getSession({ headers })`)を確認し、無ければ401(`UNAUTHORIZED`)。あればユーザーID・メールアドレス・アカウント作成日(日本時間の日付)をHonoのコンテキストに入れる
- **requireConsent**(`require-consent.ts`): 現在の`POLICY_VERSION`への同意(`terms_agreement`テーブル)が無ければ403(`CONSENT_REQUIRED`)。`GET /api/me`・`POST /api/consent`はこのチェックの対象外
- **writeRateLimit**(`write-rate-limit.ts`): 書き込み系(POST/PUT/PATCH/DELETE)に、Workers Rate Limitingバインディング(`API_RATE_LIMITER`)でユーザーID単位の制限(60秒に60回)をかける。超えたら429(`RATE_LIMITED`)。ステップ1で用意されていた60秒に300回という値は、書き込み専用の制限としては大きすぎるため見直した

未処理のエラーは`app.onError`で500(`INTERNAL_ERROR`)にし、内部のエラー内容(スタックトレースなど)は返しません(ログにはスタックトレースを出しますが、確認コードやメール本文などの機微情報は出しません)。

入力の検証は`zod`と`@hono/zod-validator`(`src/worker/lib/validation.ts`の`validate()`)で行い、検証エラーは統一して400(`VALIDATION_ERROR`)にしています。

APIの一覧は[api.md](api.md)を参照してください。

## 日付の扱い

このサービスは「今日やったかどうか」を記録するものなので、日付は常に**日本時間(Asia/Tokyo)**基準で扱います。`src/shared/domain/date.ts`に、実行環境のローカルタイムゾーンに依存しない純粋関数をまとめています。

- 「今日」の判定・任意時刻→日本時間の日付への変換は`Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" })`で行う(en-CAロケールはYYYY-MM-DD形式を返す)
- 日付同士の前後移動(前へ・次へボタン、月末の丸めなど)はUTC基準の`Date.UTC`で計算する(実行環境のタイムゾーンを混入させないため)
- 「今日」は必ず`todayInTokyo(now)`のように現在時刻を引数で受け取れる形にし、`new Date()`のローカル時刻を直接使わない(テストで時刻を固定できるようにするため)

週・月タブの期間計算(週の範囲、月のカレンダーのマス、分母の日数、前へ・次へ・今日に戻るの可否、期間の表示形式)は`src/shared/domain/period.ts`にまとめています。

## 集計の方法(GET /api/summary)

週・月タブの集計は、期間(`from`〜`to`、最大42日)を指定して1回のリクエストで取得できるようにしています(`src/worker/routes/summary.ts`)。

- 習慣一覧・期間内の習慣の記録・期間内のカロリー記録を、それぞれ1クエリずつ(合計最大3クエリ)取得し、日ごとに個別のクエリは発行しない
- 取得したデータをメモリ上でMapに整理してから、日付ごとの結果・カロリー合計、習慣ごとの達成数・分母(`eligibleDays`)を計算する
- `eligibleDays`(分母)は、期間内で「アカウント作成日以降」かつ「今日以前」の日数(`src/shared/domain/period.ts`の`countEligibleDays`)
- カロリーの平均は、記録がある日(その日にカロリー記録が1件以上ある日)だけで算出し、カロリー記録を無効にしている利用者には常に`null`を返す

## 日付の扱い

このサービスは「今日やったかどうか」を記録するものなので、日付は常に**日本時間(Asia/Tokyo)**基準で扱います。サーバー・クライアントの両方で、UTCのまま日付を丸めない(日本時間の日付境界で「今日」を判定する)ことを徹底します。具体的な実装(共通の日付関数)はステップ2以降で`src/shared/`に追加します。

## 画面の構成(フロントエンド)

画面の見た目・操作のルールは[design.md](design.md)・[week-month-tabs.md](week-month-tabs.md)を参照。ここでは実装上の構成をまとめる。

### ルーティングと振り分け

`src/react-app/router.tsx`(`createBrowserRouter`)がURL一覧(design.md 8章)を定義する。ログイン・同意の状態による振り分けは、3つのガードコンポーネントが担う。

- **RedirectIfAuthenticated**(`routes/redirect-if-authenticated.tsx`): `/login`・`/signup`・`/verify`・`/reset`・`/reset/new`をまとめる、パスを持たない層(レイアウトルート)。ログイン済みなら`/app`へ
- **ConsentGuard**(`routes/consent-guard.tsx`): `/consent`用。未ログインなら`/login`へ、同意済みなら`/app`へ
- **RequireAuth**(`routes/app/require-auth.tsx`): `/app`配下用。未ログインなら`/login`へ、未同意なら`/consent`へ

いずれも`authClient.useSession()`(セッションの有無)と、必要な場合はreact-queryの`GET /api/me`(`["me"]`キャッシュ、`consent.agreed`)を見て判定する。判定中は画面のちらつきを避けるため何も描画しない(`null`を返す)。

`/app`配下はさらに`AppShell`(`routes/app/app-shell.tsx`、パスを持たない層)を挟み、ヘッダー・日週月の切り替えを提供したうえで`Outlet`を描画する。

### データ取得と楽観的更新

`@tanstack/react-query`の`QueryClient`(`react-app/lib/query-client.ts`)を`main.tsx`で1つだけ用意し、`QueryClientProvider`でアプリ全体に配線する。サーバーのデータ(`GET /api/me`・`GET /api/days/:date`等)は`useQuery`で取得し、クエリキーは`["me"]`・`["day", date]`のように用途ごとに分ける。

記録ボタン(◯△×)・カロリーの記録は「押した瞬間に保存する」という仕様(design.md 7章)のため、`queryClient.setQueryData()`で画面を先に更新してから`PUT`/`POST`等を呼ぶ楽観的更新にしている(`routes/app/day-tab.tsx`の`handlePick`)。保存前の値は`getQueryData()`で退避しておき、失敗したら書き戻す。`useMutation`は使わず、素朴な`async`関数+`try/catch`にしている(処理の見通しを優先した)。

### 認証クライアント

Better Authのフロントエンド用クライアントは`better-auth/react`の`createAuthClient`と`better-auth/client/plugins`の`emailOTPClient`を`react-app/lib/auth-client.ts`にまとめている。`authClient.useSession()`はnanostoresベースのフックで、`emailOtp.verifyEmail()`等の呼び出し後に自動でセッションの状態を再取得する(`atomListeners`)。

新規登録(`/api/auth/sign-up/email`)のみサーバー側でTurnstileトークンの検証(`turnstileMiddleware`)が入るため、`withTurnstileToken(token)`ヘルパーで`x-turnstile-token`ヘッダーを付けて呼び出す。このミドルウェアが返すエラーの形(`{ error: { code, message } }`、アプリの他のAPIと同じ形)は、Better Auth自身のエラーの形(フラットな`{ code, message }`)と異なるため、`getAuthErrorCode(error)`でどちらの形でも読み取れるようにしている。

### APIクライアント

`src/react-app/api/`に、`docs/api.md`の各エンドポイントに対応する関数と型を用意している。`client.ts`の`apiClient`が、`fetch`の共通処理(`credentials: "include"`、JSONの組み立て・解析)とエラーレスポンス(`{ error: { code, message } }`)の`ApiError`への変換をまとめており、`errors.ts`の`toDisplayMessage()`でエラーコードごとの日本語文言に変換する(サーバーの`message`は基本的にそのまま利用者向けの文になっているため、それを優先し、無ければコードごとの既定文言にfallbackする)。

### 共通の部品

`src/react-app/components/`に、ボタン(`Button`。`to`/`href`の有無でLink/a/buttonを描画し分ける)・入力欄(`TextField`/`PasswordField`)・トースト(`Toast`。Reactのcontext+`useToast()`)・スケルトン(`Skeleton`)・ダイアログ(`Dialog`。ネイティブの`<dialog>`+`showModal()`。フォーカスの往復は独自に保証している)をまとめている。

### スタイルの書き方

画面ごとに`*.module.css`(CSS Modules)を対応させ、色・文字は`styles/tokens.css`のCSS変数を参照する。固定の見た目(サイズ・色・余白等)はCSSクラスで書き、`style`属性は実行時にしか決まらない値(スケルトンの幅・高さ等)にのみ使う(AGENTS.md参照)。1024px以上のレイアウトはCSS Modules内の`@media (min-width: 1024px)`で切り替える。

## 既知の落とし穴と対策

過去のプロジェクトで実際に起きた問題と、その対策です。

1. **`compatibility_date`が古いと未処理のPromise拒否が誤検知される/新しすぎると`pnpm dev`が起動しない**: 古い日付だとBetter Authのログイン失敗時に発生する既知の問題(Better Auth issue #10658、互換性フラグ`unhandled_rejection_after_microtask_checkpoint`で解消)が起きる。一方、`pnpm dev`が使う`@cloudflare/vite-plugin`同梱のworkerdが対応していない新しい日付を指定すると、「This Worker requires compatibility date ..., but the newest date supported by this server binary is ...」で起動に失敗する(`wrangler dev`は別の新しい実行環境を持つため、`wrangler dev`での確認だけでは気づけない)。`compatibility_date`は2026-03-03以降、かつ`pnpm dev`の実行環境が対応している日付にし、依存パッケージ更新時に上げてよい。動作確認は`pnpm dev`(利用者が普段使う方法)で行う
2. **Better Authのレート制限が実質効かない**: 既定のメモリ保存はWorkerのisolateごとにカウンタが分かれるため。`storage: "database"`にし、IPアドレスは`cf-connecting-ip`から取得する
3. **静的ファイルにWorker経由でヘッダーを付けると無料枠の消費が早い**: ステップ1では`assets.run_worker_first: true`にしてすべてのリクエストをWorker経由にし、ASSETSバインディングのレスポンスを複製してヘッダーを付けていたが、日本語フォントなど細かいファイルを含む1回の画面表示でWorkerが何十回も動いてしまう問題があった。ステップ2で`run_worker_first: ["/api/*"]`に戻し、静的ファイルのヘッダーは`public/_headers`で付ける方式に変更した(`/api/*`のヘッダーは引き続き`securityHeadersMiddleware`で付ける)。両方の値がずれないよう、`src/shared/security-headers.ts`に値を一元化し、`test/frontend/security-headers-file.test.ts`で`public/_headers`の内容と一致することを確認している
4. **本番でconsole/memoryのメール送信が使われる**: 確認コードが届かない上、ログに平文で残る。本番URL(https://)でconsole/memoryが指定されたら例外を投げる安全装置を入れている
5. **Workers Rate Limitingバインディングのperiodは10秒か60秒のみ**: 長い期間の制限はBetter Auth側のcustomRulesで行う
6. **D1を使うテストでマイグレーションが未適用**: `@cloudflare/vitest-plugin`の`readD1Migrations`/`applyD1Migrations`を、テストのセットアップファイル(`test/worker/apply-migrations.ts`)で呼び出している
7. **Email Sendingで任意の宛先に送るにはPaidプランが必要**: 開発・テストではconsole/memoryを使う
8. **Turnstileはフロントエンドだけでは防御にならない**: サーバー側でsiteverify APIを呼んで検証する
9. **テストが監視モードのままだと終了しない**: `test`スクリプトは`vitest run`(1回だけ実行)にしている
