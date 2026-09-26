import { Hono } from "hono";
import { createAuth } from "./auth";
import { turnstileMiddleware } from "./middleware/turnstile";
import { securityHeadersMiddleware } from "./middleware/security-headers";
import { disabledAuthEndpointsMiddleware } from "./middleware/disabled-auth-endpoints";

// Hono アプリのエントリーポイント。wrangler.json の assets.run_worker_first を ["/api/*"] にしているため、
// このWorkerが処理するのは /api/ 配下のリクエストのみ。それ以外の静的ファイル(SPA本体・画像・フォントなど)は
// Workerを経由せずCloudflareのアセット配信が直接返す(ヘッダーは public/_headers で付ける)
const app = new Hono<{ Bindings: Env }>();

// 全レスポンスにセキュリティヘッダを付ける
app.use("*", securityHeadersMiddleware);

// 新規登録のみTurnstileの検証を必須にする(Honoのミドルウェアで対象パスを絞る)
app.use("/api/auth/sign-up/email", turnstileMiddleware);

// 使わない機能(コードだけでログインできるエンドポイントなど)は、Better Authに渡す前に閉じる
app.use("/api/auth/*", disabledAuthEndpointsMiddleware);

// Better Auth本体。Workerではリクエストごとにenvを使ってインスタンスを作る必要があるため、
// ここで毎回 createAuth(c.env) を呼び出す
app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

// 死活監視用のエンドポイント
app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;
