import { Hono } from "hono";

// Hono アプリのエントリーポイント。/api/ 以外のパスは wrangler.json の assets 設定により
// SPA の静的ファイル(index.html)として返される
const app = new Hono<{ Bindings: Env }>();

// 死活監視用のエンドポイント。T2でこれをテストする
app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;
