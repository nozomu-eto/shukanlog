# CLAUDE.md

Cloudflare Workers 関連の注意点は AGENTS.md を参照。ここでは shukanlog プロジェクトの規約をまとめる。

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

## 既知の落とし穴

AGENTS.md の「既知の落とし穴」の章を参照。Better Auth のレート制限・メール送信の安全装置・compatibility_date・D1マイグレーションなど、過去のプロジェクトで実際に起きた問題への対策をまとめてある。
