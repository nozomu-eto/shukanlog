import { Hono } from "hono";
import { createAuth } from "./auth";
import { turnstileMiddleware } from "./middleware/turnstile";
import { securityHeadersMiddleware } from "./middleware/security-headers";
import { serveAssets } from "./routes/assets";

// Hono アプリのエントリーポイント。wrangler.json の assets.run_worker_first で
// すべてのリクエストが必ずこのWorkerを通るようにしている(セキュリティヘッダを付けるため)
const app = new Hono<{ Bindings: Env }>();

// 全レスポンスにセキュリティヘッダを付ける
app.use("*", securityHeadersMiddleware);

// 新規登録のみTurnstileの検証を必須にする(Honoのミドルウェアで対象パスを絞る)
app.use("/api/auth/sign-up/email", turnstileMiddleware);

// Better Auth本体。Workerではリクエストごとにenvを使ってインスタンスを作る必要があるため、
// ここで毎回 createAuth(c.env) を呼び出す
app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

// 死活監視用のエンドポイント
app.get("/api/health", (c) => c.json({ status: "ok" }));

// /api/ 以外はすべて静的ファイル(SPA)として返す
app.get("*", serveAssets);

export default app;
