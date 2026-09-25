# ステップ1 進捗管理

## T0: 作業前の準備

- [x] git status確認(未コミットの変更なし。stash不要)
- [x] docs/design.md、docs/week-month-tabs.md、docs/design/mockups/、docs/legacy/ の存在確認
- [x] feat/foundation ブランチを作成
- [x] docs/progress/step1.md を作成

## タスク一覧

- [x] T1: 雛形を整える
- [x] T2: テストとlintの準備
- [x] T3: wranglerの設定と本番環境の分離
- [x] T4: D1とdrizzle
- [x] T5: メール送信
- [x] T6: Better Authの基本設定
- [x] T7: 確認コード(6桁)による確認・パスワード再設定
- [x] T8: 認証のレート制限
- [x] T9: 新規登録のbot対策(Turnstile)
- [ ] T10: セキュリティヘッダとキャッシュ
- [ ] T11: デザインの基礎(色・文字)
- [ ] T12: アイコンとStatusIcon
- [ ] T13: 画面の骨組み(ルーティング)
- [ ] T14: ドキュメント
- [ ] T15: PRの作成

## 判断ログ

### T0(記録の訂正)

- 以前のコミットで作成された本ファイルに、このリポジトリ以外のリポジトリ(../mokuhyo-planner、../kyurl-link)を参照した記述が誤って含まれていた。指示の最重要ルール「このリポジトリ以外のリポジトリは参照しない」に反するため、該当の記述を削除し、タスク一覧・T0のログを指示内容に合わせて書き直した。

### T1

- tsconfig のテスト用設定(tsconfig.test.json)は、T1時点では test/ 配下に実ファイルが存在せず、include が空だと tsc がエラーになるため、T2でテストファイルと同時に追加することにした。T1では既存のフロントエンド用(tsconfig.app.json)・Worker用(tsconfig.worker.json)の分割のみを維持する
- React Router は react-router-dom を採用した(SPA として使うための標準的な選択で、公式ドキュメント上もライブラリモードでの利用が案内されている)
- ルーティングの本実装(design.md 8章のURL一覧)はT13で行うため、T1では最小限のプレースホルダー("/" のみ)を用意した
- styles/tokens.css・styles/ui.css は空の器としてT1で作成し、内容はT11で定義する
- git remote が未設定(origin なし)で push できなかったため、ユーザーに確認したところ「push せずローカルでコミットのみ進める」との指示を受けた。以降のタスクはローカルコミットのみ行い、pushとT15のPR作成は行わない(T15で改めて記録する)

### T2

- Worker用のテストランナーは、当初 `@cloudflare/vitest-pool-workers` を導入しようとしたが、Cloudflare公式ドキュメント(2026-09-25時点)を確認したところ `@cloudflare/vitest-plugin`(`cloudflareTest()`)が pool-workers を置き換える現行パッケージであることが判明したため、こちらを採用した(Vitest 4.1以上が必要)
- Worker用テストとフロントエンド用テストは、実行環境(実際のWorkersランタイム vs jsdom)が異なり1つの設定に同居できないため、ルートの vitest.config.ts の `test.projects` で test/worker/vitest.config.ts と test/frontend/vitest.config.ts の2つを束ねる構成にした
- tsconfig.test.json をT1で見送った分、ここで追加した(test/ 配下に実ファイルができたため)
- D1マイグレーションの適用の仕組み(readD1Migrations/applyD1Migrations)は、D1バインディング自体がまだ無いためT4で行うことにし、T2では /api/health の最小テストのみ用意した

### T3

- Cloudflare公式ドキュメントを確認したところ、`assets`と`main`(Worker)を両方設定した場合、既定では静的アセットが優先され、Workerは静的ファイルに一致しないリクエストにのみ実行される仕様だった。これだと /api/health も(一致する静的ファイルが無いため)SPAのフォールバックでindex.htmlが返ってしまう。`assets.run_worker_first: ["/api/*"]` を指定することで /api/ 配下は常にWorkerが処理するようにした。`wrangler dev`を実際に起動し、`/api/health`が200のJSON、`/`がSPAのHTMLを返すことを確認した
- Wranglerの環境(env.production)は、compatibility_date/compatibility_flags/assetsなど一部のキーはトップレベルから引き継がれるが、vars・d1_databases・send_email・ratelimits などのバインディング系キーは環境ごとに完全に再定義が必要という公式ドキュメントの記載を確認し、production環境側に同じ形でバインディングを書いた
- 開発用D1のdatabase_idは、実際のD1データベース作成をT4で行うため、T3時点では "REPLACE_WITH_DEV_D1_DATABASE_ID" のプレースホルダーにした(ローカル実行のみなら実IDが無くても`wrangler dev`は起動できることを確認済み)
- Workers Rate Limitingバインディング(ratelimits)は、ログイン等の細かい制限はBetter AuthのcustomRules(T8)で行う方針のため、ここではAPI全体への過度なアクセスを防ぐ粗い制限(60秒に300回)として`API_RATE_LIMITER`を1つ定義した。用途はT8以降で検討する
- send_emailバインディングは、開発・テストではconsole/memory実装を使いCloudflareのEmail Sendingを使わないため、production環境にのみ定義した
- deploy:productionスクリプトはタスク指示通り作成したが実行はしていない

### T4

- src/worker/db/schema/index.ts は、認証テーブル(T6)やドメインテーブル(ステップ2以降)をまだ持たない空のバレルファイルとして用意した。この時点でテーブルが無いため `drizzle-kit generate` は「No schema changes」で何も生成しない。migrations/ の仕組み自体(readD1Migrations→miniflareのbindingsに注入→apply-migrations.tsでapplyD1Migrations)が正しく動くことは、D1へ `SELECT 1` を投げるテスト(test/worker/db.test.ts)で確認した。実際のテーブル定義・マイグレーションはT6以降で追加する
- cloudflare:test の `env` の型は `Cloudflare.Env`(worker-configuration.d.tsのnamespace)であり、素のグローバル`Env`とは別物だったため、テスト専用のTEST_MIGRATIONSバインディングの型は `declare global { namespace Cloudflare { interface Env {...} } }` で拡張する必要があった(最初グローバルEnvを拡張して失敗した)
- migrations/ ディレクトリはgitで空ディレクトリを追跡できないため .gitkeep を置いた

### T5

- Cloudflare公式ドキュメントを確認したところ、send_emailバインディングには生MIMEを組み立てる従来のEmailMessage方式に加え、`env.MAILER.send({ to, from, subject, text, html })` という構造化オブジェクトをそのまま渡せる新しいAPIがあることが分かったため、依存(mimetext)を増やさずに済むこちらを採用した
- createMailerの引数型は、生成されたEnv型のMAIL_TRANSPORTがwrangler.jsonのvarsから導出されるリテラルユニオン("console"|"cloudflare")になっており"memory"を受け付けられないため、Mailer用に独自の最小限のMailerEnv型(MAIL_TRANSPORT: string)を定義して受け取るようにした。これによりテスト用の"memory"も型エラー無く渡せる
- メモリ実装の送信記録は、モジュールスコープの配列に保持し、getSentMails/resetSentMailsで参照・初期化する方式にした(テストごとにbeforeEachでリセット)

### T6

- Better AuthのCLI(`@better-auth/cli`)はnpm上で「DEPRECATED」となっていた。現在の公式ドキュメントを確認したところ、CLIは`auth`という独立パッケージに移り、`npx auth generate --adapter drizzle --dialect sqlite`の形で使うことが分かったため、こちらを採用した。あわせて better-auth 本体もCLIと同じ1.7.6に揃えた
- スキーマ生成専用に src/worker/auth/cli.config.ts を用意した。D1は実際のリクエスト時のバインディングでしか得られないため、CLI実行時は `drizzle({} as D1Database)` というダミーの接続でdrizzleAdapterの形だけを与えている(実際に接続はしない、生成のためだけの設定でありアプリのコードからは読み込まない)
- Better Authのインスタンスは、Workerがリクエストごとに異なるenv(D1バインディング等)を受け取る都合上、モジュールスコープの単一インスタンスにはせず、`createAuth(env)`という関数でリクエストごとに生成する方式にした(Hono統合ドキュメントの推奨パターンに沿った)
- BETTER_AUTH_SECRETはwrangler.jsonのvarsではなく、シークレット(開発は.dev.vars、本番はwrangler secret)として扱うことにした。型は生成されたEnv型に無いため、src/worker/env.d.tsで global の `Env` と `Cloudflare.Env` の両方を拡張する必要があった(cloudflare:testの`env`はCloudflare.Env型、Honoの`Bindings`は素のEnv型を使っており、両方を拡張しないと型エラーになった)。あわせて、この拡張がテスト用のtsconfig(tsconfig.test.json)のコンパイル対象にも含まれるよう include を修正した(含まれていないと、テストの型チェックだけ別プログラム扱いになり拡張が効かなかった)
- requireEmailVerification: true を設定した状態で、メール確認用のコールバック(sendVerificationEmail)を何も設定せずに登録→ログインを試したところ、登録は成功しログインはエラーになることを実際にテストで確認した。確認コードでの確認・メールテンプレートの適用はT7で行う
- 認証テーブル(user/session/account/verification)のマイグレーションは `npx auth generate` → `pnpm run db:generate` で生成した(migrations/0000_equal_daredevil.sql)

### T7

- emailOTPプラグインのオプションは、公式ドキュメントとインストール済みパッケージの型/実装(node_modules/better-auth/dist/plugins/email-otp/routes.mjs)を直接確認して決めた。otpLength: 6、expiresIn: 600(秒、10分)、allowedAttempts: 3(誤り試行の上限)、overrideDefaultEmailVerification: true(リンク方式をコード方式に置き換える公式オプション)を設定した
- **メールアドレスの変更をコードで行えるかの調査結果**: 行える。emailOTPプラグインは同じプラグイン内に `changeEmail: { enabled: true, verifyCurrentEmail?: boolean }` というオプションを持ち、有効化すると `POST /api/auth/email-otp/request-email-change`(ログイン中のユーザーが新しいメールアドレス宛にコードを送る。currentEmailの確認を必須にするかはverifyCurrentEmailで選べる)と `POST /api/auth/email-otp/change-email`(コードで確定する)の2つのエンドポイントが使えるようになることを、実装コード(requestEmailChangeEmailOTP/changeEmailEmailOTP、sensitiveSessionMiddleware付き)で確認した。今回のT7では`changeEmail`オプションは有効化していない(画面の実装は指示によりステップ4で行うため)。ステップ4でこのオプションを`true`にし、対応する画面・APIを実装すればよい
- パスワード再設定エンドポイント(/email-otp/reset-password)は、成功時に未確認だったメールアドレスも自動的にemailVerified: trueにする実装になっていた(実装コードで確認)。これはBetter Auth側の挙動であり、こちらで追加の対応は不要だった
- 送信するメールの件名・本文は docs/legacy/email-templates.md の文面をそのまま使い、有効期限だけ元々10分表記だったのでそのまま踏襲した(書き換え不要だった)
- emailOTPプラグインを追加しても、verification テーブルを再利用する実装のため、drizzleのスキーマ・マイグレーションに差分は発生しなかった(`npx auth generate`後にdiffなしを確認済み)

### T8

- customRulesのキーはBetter Authのエンドポイントのパス(例: "/sign-in/email")で、値は `{ window, max }`(秒・回数)であることを公式ドキュメントで確認した。指示にあった各制限を次のパスに割り当てた: ログイン→"/sign-in/email"(60/5)、新規登録→"/sign-up/email"(60/3)、確認コードの送信・再送→"/email-otp/send-verification-otp"(60/1)、コードの検証→"/email-otp/verify-email"(60/5)、パスワード再設定の要求→"/email-otp/request-password-reset"(300/3)
- 指示に無かった判断として、パスワード再設定を確定するエンドポイント("/email-otp/reset-password")にもコード検証と同じ60秒5回の制限を追加した(このエンドポイント自体がOTP検証を兼ねているため、検証と同水準の制限が必要と判断した)
- IPアドレスの取得は、rateLimitオプションではなくトップレベルの`advanced.ipAddress.ipAddressHeaders`で設定することをドキュメントで確認し、`["cf-connecting-ip"]`を指定した(既知の落とし穴2)
- rateLimit.storage: "database" にしたことで rate_limit テーブルが追加になったため、`npx auth generate` → `pnpm run db:generate` を再実行し、新しいマイグレーション(migrations/0001_white_stepford_cuckoos.sql)を生成した
- テストは、同一IPから6回連続でログイン失敗を試み、6回目が429になること、そして制限に達した後でも別IPからの試行は429にならないことを確認する形にした

### T9

- 公式ドキュメントでTurnstileのテスト用キーを確認した。secretは常に成功する `1x0000000000000000000000000000000AA` を.dev.vars.exampleに設定した(失敗させたい場合は `2x0000000000000000000000000000000AA` に差し替える旨をコメントで残した)
- siteverify APIのリクエストは `secret`・`response`・`remoteip` のフィールド名、レスポンスは `success` の真偽値であることを公式ドキュメントで確認して実装した
- 新規登録にTurnstileを必須にしたことで、T6・T7で書いた既存のテスト(サインアップを行うもの)がトークン無しで失敗するようになったため、共通のテストヘルパー(test/worker/support/turnstile.ts の stubTurnstileSiteverify)を作り、該当テストにヘッダーとモックを追加して修正した
- Turnstileの検証はHonoのミドルウェア(src/worker/middleware/turnstile.ts)として実装し、`app.use("/api/auth/sign-up/email", turnstileMiddleware)` で対象パスのみに適用した。他の認証エンドポイント(ログイン・コード確認等)には適用していない(指示通り新規登録のみ)
