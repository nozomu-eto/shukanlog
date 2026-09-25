# shukanlog

服薬・運動・カロリーを記録し、週・月で振り返るための個人向け健康習慣記録サービスです。

自分自身が服薬や運動の習慣をなかなか続けられず、「今日やったかどうか」を振り返る場所が欲しくて作り始めました。1日ごとに◯△×で記録し、週・月単位でどれくらい続けられているかを見返せることを目指しています。誰でも登録できる公開サービスとして運用します。

## 技術構成

- フロントエンド: React + React Router(SPA) + Vite
- API: Hono(Cloudflare Workers)
- 認証: Better Auth(メールアドレス・パスワード、確認コードによるメール確認、Turnstileによるbot対策)
- データベース: Cloudflare D1 + drizzle
- メール送信: Cloudflare Email Sending(本番)/ console・memory(開発・テスト)
- スタイル: CSS変数 + 通常のCSS(Tailwindは使わない)
- デプロイ先: Cloudflare Workers

デザイン・画面の仕様は [docs/design.md](docs/design.md) と [docs/week-month-tabs.md](docs/week-month-tabs.md) を正としています。技術的な構成やハマりどころの詳細は [docs/architecture.md](docs/architecture.md) にまとめています。

## ローカル開発

パッケージマネージャーは pnpm のみを使います。

```bash
pnpm install
cp .dev.vars.example .dev.vars   # 必要に応じて値を書き換える
pnpm run dev
```

`http://localhost:5173` で開発サーバーが起動します。

### D1(ローカル)へのマイグレーション適用

```bash
pnpm run db:migrate:local
```

## テストの実行

```bash
pnpm run test        # 1回だけ実行して終了する
pnpm run test:watch  # 監視モード
pnpm run typecheck
pnpm run lint
```

Worker側のテストは `@cloudflare/vitest-plugin` により実際のWorkersランタイム上で、フロントエンド側のテストは jsdom + Testing Library で実行します。

## デプロイ

本番環境へのデプロイ前に、[docs/production-verification.md](docs/production-verification.md) の確認項目をすべて満たしていることを確認してください。

```bash
pnpm run deploy:production
```

このコマンドは、本番D1へのマイグレーション適用 → ビルド → `wrangler deploy --env production` の順に実行します。事前に本番用のD1データベース作成、各種シークレットの登録(`wrangler secret put`)が必要です。
