# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- https://developers.cloudflare.com/workers/
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Commands

| Command | Purpose |
|---------|---------|
| `npx wrangler dev` | Local development |
| `npx wrangler deploy` | Deploy to Cloudflare |
| `npx wrangler types` | Generate TypeScript types |

Run `wrangler types` after changing bindings in wrangler.jsonc.

## Local Explorer (Debugging & Inspection)

When running `npx wrangler dev`, a Local Explorer API is available for inspecting and debugging local Workers, bindings, and storage state. The API base URL is printed in the terminal when the dev server starts.

Key endpoints (relative to the dev server URL):

| Endpoint | Description |
|----------|-------------|
| `GET /cdn-cgi/local/explorer/api/local/workers` | List local Workers and their bindings |
| `GET /cdn-cgi/local/explorer/api/storage/kv/namespaces` | List KV namespaces |
| `GET /cdn-cgi/local/explorer/api/d1/database` | List D1 databases |
| `GET /cdn-cgi/local/explorer/api/r2/buckets` | List R2 buckets |
| `GET /cdn-cgi/local/explorer/api/workers/durable_objects/namespaces` | List Durable Object namespaces |
| `GET /cdn-cgi/local/explorer/api/workflows` | List Workflows |
| `POST /cdn-cgi/local/explorer/api/local/observability/query` | Run a read-only SQL query (SELECT/WITH only) over captured request traces and console logs. Tables: `spans`, `logs` (read attributes via `json(attributes)`). Example: `curl -X POST <base>/cdn-cgi/local/explorer/api/local/observability/query -H 'Content-Type: application/json' -d '{"sql":"SELECT service, name, outcome, duration_ms FROM spans WHERE parent_id IS NULL LIMIT 20"}'` |
| `POST /cdn-cgi/local/explorer/api/local/observability/clear` | Clear all captured traces and logs |

If the routes above don't cover what you need, fetch the full OpenAPI schema (large - use only as a last resort): `GET /cdn-cgi/local/explorer/api`

Use the Local Explorer to debug issues by inspecting storage state (KV keys, D1 rows, R2 objects, DO storage), viewing Worker bindings, and querying request traces and logs captured during the dev session.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`

## Best Practices (conditional)

If the application uses Durable Objects or Workflows, refer to the relevant best practices:

- Durable Objects: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- Workflows: https://developers.cloudflare.com/workflows/build/rules-of-workflows/

# shukanlog プロジェクト規約

## 概要

shukanlog は、服薬・運動・カロリーを記録し、週・月で振り返る個人向けの健康習慣記録サービス。誰でも登録できる公開サービスとして運用する。

## 仕様の正となるドキュメント

- デザインと画面の仕様は docs/design.md と docs/week-month-tabs.md が正。これと矛盾する実装をしない
- docs/design/mockups/ は画面のモックアップ(参照専用のHTML)。実装の見た目はここを参照する
- 画面は 1024px 以上の PC レイアウトを前提にする

## 開発の基本ルール

- パッケージマネージャーは pnpm のみを使う(npm/yarn は使わない)
- 実装は TypeScript で書く
- コードには日本語コメントを書く。「処理の内容」と「その処理の役割・目的」がわかるように書く
- コミットメッセージは Conventional Commits 形式・日本語で書く
- ライブラリ(Hono、React Router、Better Auth、drizzle、Cloudflare Workers/D1/Email Sending/Turnstile/Rate Limiting、Fontsource、lucide-react)の仕様は、Context7または公式ドキュメントで現行バージョンを確認してから使う。推測で書かない

## ディレクトリ構成

- `src/react-app/`: フロントエンド(React、React Router)。`main.tsx`、`routes/`(ページ)、`components/`(部品)、`api/`(APIの呼び出し)
- `src/worker/`: Hono の API。`index.ts`(アプリの入口)、`auth/`(Better Auth の設定)、`db/schema/`(drizzle のスキーマ)、`lib/`(メール送信・Turnstile などの部品)、`middleware/`、`routes/`
- `src/shared/`: フロントエンドと API の両方で使うもの(型、入力上限などの定数、日付などの純粋関数)
- `styles/`: `tokens.css`(CSS変数)、`ui.css`(基本のスタイル)。スタイルは CSS 変数と通常の CSS で書き、Tailwind は使わない
- `migrations/`: D1 のマイグレーション(drizzle-kit で生成)
- `test/worker/`: API のテスト(`@cloudflare/vitest-pool-workers` で実際の Workers ランタイムで動かす)
- `test/frontend/`: 画面・部品のテスト(jsdom + Testing Library)
- API のパスは `/api/` で始める。それ以外のパスは SPA(静的ファイル)として返す

## API のエラーレスポンス

エラーレスポンスは `{ error: { code, message } }` の形に統一し、内部のエラー内容(スタックトレースなど)は返さない。

## 既知の落とし穴(必ず対策する)

1. `compatibility_date` が古いと、Better Auth でログイン失敗時に「未処理の Promise 拒否」が誤検知され、テストが非ゼロで終了することがある(Better Auth の issue #10658)。一方で、新しすぎる日付を指定すると、`pnpm dev`(`@cloudflare/vite-plugin` 同梱の workerd)が対応しておらず起動に失敗する(`wrangler dev` は別の新しい実行環境を持つため、`wrangler dev` での確認だけでは気づけない)。`compatibility_date` は **2026-03-03 以降(Better Auth の誤検知を避けるため)、かつ `pnpm dev` の実行環境が対応している日付** にする。依存パッケージを更新したときに、より新しい日付に上げてよい。動作確認は利用者が普段使う `pnpm dev` で行う(`wrangler dev` だけで確認しない)
2. Better Auth のレート制限は既定でメモリに保存され、Workers では isolate ごとにカウンタが分かれるため実質的に効かない。`storage: "database"` にし、テストでも有効にする。IPアドレスの取得には `cf-connecting-ip` ヘッダーを使う
3. Workers の静的ファイル(ASSETS)から返したレスポンスは、ヘッダーを直接変更できない。セキュリティヘッダを付けるには、レスポンスを複製(`new Response(res.body, res)`)してから付ける
4. メール送信を開発用の console のまま本番に出すと、確認コードが届かず誰も登録できないうえ、コードがログに平文で残る。本番の URL(https://)で console / memory のメール送信が使われたら例外を投げる安全装置を入れる
5. Workers Rate Limiting バインディング(wrangler の ratelimits)の period は 10 秒か 60 秒しか指定できない。長い期間の制限は Better Auth 側の customRules で行う
6. D1 を使う API のテストでは、テスト開始時にマイグレーションを適用する必要がある(`@cloudflare/vitest-pool-workers` の `readD1Migrations` / `applyD1Migrations` を使う)
7. Email Sending で、登録していない任意の宛先に送るには Workers Paid プランが必要。開発・テストでは console / memory のメール送信を使う
8. Turnstile の検証は、フロントエンドにウィジェットを置くだけでは防御にならない。サーバー側で siteverify API を呼んで検証する。ローカル・テストでは Cloudflare 公式のテスト用キーを使う
9. テストスクリプトが監視モードのままだと CI やエージェントからの実行が終了しない。`test` は 1 回だけ実行して終了する形にする

## スタイルの方針(CSP)

CSP は style 要素・外部CSS を `'self'` のみ許可し(`style-src-elem`)、style 属性だけ `'unsafe-inline'` で許可している(`style-src-attr`)。固定の見た目は必ず CSS のクラスで書き、style 属性はグラフの棒の高さのような、実行時の計算でしか決まらない値にのみ使う。

## 画面の実装ルール

- スタイルは CSS Modules(`*.module.css`)で書き、色・文字・余白は `styles/tokens.css` の CSS 変数を使う。固定の見た目を style 属性で書かない(style 属性は計算で決まる値だけ。上記CSPの方針と同じ)
- レイアウトは画面幅 1024px 未満をスマホ(1列)、1024px 以上を PC(2列など)とし、CSS Modules 内の `@media (min-width: 1024px)` で切り替える。DOM の親子構造を条件分岐で変えず、CSS Grid の `grid-template-areas` 等で配置だけを切り替えられないか先に検討する(`routes/app/app-shell.module.css` 参照)
- 画面の見た目は `docs/design/mockups/` のモックアップ(参照専用の HTML、そのままでは表示されない)を見て、構造・余白・文字サイズ・色・文言を確認したうえで、`docs/design.md` の規則に沿って React のコンポーネントとして作り直す。規則とモックアップが食い違う場合は `docs/design.md` を優先する。文言(見出し・ボタン・エラー文など)はモックアップのものをそのまま使う
- 個人情報(メールアドレスなど)を URL のクエリに入れない。画面間で受け渡す必要がある場合は、React Router の `state` または `sessionStorage`(直接URLを開いた場合のフォールバック用)を使う(`react-app/lib/pending-email.ts` 参照)
- API の呼び出しは `src/react-app/api/` のクライアント経由で行い、エラーレスポンス(`{ error: { code, message } }`)は `api/errors.ts` の `toDisplayMessage()` で画面の文言に変換する
- サーバーから取得するデータは `@tanstack/react-query` で管理する。押した瞬間に保存する操作(記録ボタン等)は `queryClient.setQueryData()` による楽観的更新を行い、失敗したら `getQueryData()` で退避しておいた値に書き戻す
