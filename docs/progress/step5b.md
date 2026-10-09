# ステップ5b 進捗管理(本番デプロイ前の修正)

## タスク一覧

- [x] T1: deploy:production を CLOUDFLARE_ENV=production のビルドに合わせる
- [x] T2: 本番の ratelimits の namespace_id を 2001番台にする
- [x] T3: docs/production-verification.md 1・2章の書き直し
- [x] T4: docs/design.md の色の表に --color-border-strong を追記
- [x] T5: test / typecheck / lint / build の確認、PR作成(マイグレーションなし)

## 判断ログ

### T0

- PR #7・#8 は main にマージ済み。`git fetch` 後、origin/main から feat/deploy-fix を作成した

### T1

- 公式 changelog(2025-11-09)の通り、環境はビルド時に確定する。`build:production`(`CLOUDFLARE_ENV=production pnpm run build`)を追加し、`deploy:production` はそれを先に実行する
- 実際に生成されたファイルで確認した結果:
  - `.wrangler/deploy/config.json` は `dist/shukanlog/wrangler.json` を指す
  - `dist/shukanlog/wrangler.json` は `targetEnvironment: "production"`、`name: shukanlog-production`、D1 は `shukanlog-production`、ratelimits は本番の値、`BETTER_AUTH_URL` は本番、cron・send_email も本番だった
  - `wrangler deploy --dry-run` のバインディング一覧も本番の内容だった。よって `wrangler deploy` に `--env` は不要
- **`wrangler d1 migrations` はこの生成設定を使わない**。`--env` なしで実行すると開発用DB(`REPLACE_WITH_DEV_D1_DATABASE_ID`)を指し、`--env production` を付けると本番DBを指すことを確認した。そのため migrations apply には `--env production` を残した(付け忘れると開発用DBに適用しようとする)
- 実際のリモートには接続していない(database_id がプレースホルダーのため、API はどちらもIDの不正で失敗した)
- 順序は「ビルド → マイグレーション → デプロイ」。マイグレーションの前にビルドが失敗すれば、DBは変更されない
- スクリプトの `npm run build` は規約(pnpm のみ)に合わせて `pnpm run build` にした

### T2

- 公式ドキュメント(Workers の Rate Limiting バインディング)で確認: `namespace_id` は「Cloudflareアカウント内で一意になる、自分で定義する正の整数」。同じ値のバインディングは別Workerでもカウンターを共有する。つまりアカウント単位の値で、払い出されるものではない
- kyurl-link(1001〜1004)と重ならないよう、本番を API_RATE_LIMITER=2001、EMAIL_CHANGE_RATE_LIMITER=2002 にした
- トップレベル(開発用)の 1001・1003 は kyurl-link と重なるが、ローカル実行のみでデプロイされないため変更しない(依頼は env.production のみ)

### T3

- 1章に namespace_id は自分で決める値であることと2001・2002を記載、2章に `pnpm deploy:production` の流れと migrations だけ `--env production` が必要な理由を記載した

### T4

- 実際に使われている箇所(設定画面のスイッチの土台、退会ボタンの枠線。styles/tokens.css の値は #c9c8c1)を用途として「強い区切り線」の行を追記した

### T5

- pnpm test(51ファイル・175件)/ typecheck / lint(エラー0・警告1)/ build がすべて通った
- マイグレーションの追加なし
