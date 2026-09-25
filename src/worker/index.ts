import { Hono } from "hono";
import { createAuth } from "./auth";
import { turnstileMiddleware } from "./middleware/turnstile";

// Hono アプリのエントリーポイント。/api/ 以外のパスは wrangler.json の assets 設定により
// SPA の静的ファイル(index.html)として返される
const app = new Hono<{ Bindings: Env }>();

// 新規登録のみTurnstileの検証を必須にする(Honoのミドルウェアで対象パスを絞る)
app.use("/api/auth/sign-up/email", turnstileMiddleware);

// Better Auth本体。Workerではリクエストごとにenvを使ってインスタンスを作る必要があるため、
// ここで毎回 createAuth(c.env) を呼び出す
app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

// 死活監視用のエンドポイント
app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;
