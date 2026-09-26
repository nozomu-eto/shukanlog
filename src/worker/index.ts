import { Hono } from "hono";
import { createAuth } from "./auth";
import { turnstileMiddleware } from "./middleware/turnstile";
import { securityHeadersMiddleware } from "./middleware/security-headers";
import { disabledAuthEndpointsMiddleware } from "./middleware/disabled-auth-endpoints";
import { apiRouter } from "./routes";
import { runScheduledPurge } from "./scheduled/purge";

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

// 認証・同意の確認が必要なAPI(/api/me、/api/consentを含む)。/api/health・/api/auth/*以外の/api/配下はここで処理する
app.route("/api", apiRouter);

// 未処理のエラーはここでまとめて500にし、内部のエラー内容(スタックトレースなど)は返さない。
// ログにはスタックトレースを出してよいが、確認コードやメール本文などの機微情報は出さない
app.onError((err, c) => {
	console.error(err);
	return c.json({ error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました" } }, 500);
});

const worker: ExportedHandler<Env> = {
	fetch: app.fetch,
	// Cron Trigger(wrangler.jsonのtriggers.crons)から毎日1回呼ばれる定期処理。
	// 退会から30日後の完全削除・メール未確認のまま30日を過ぎた利用者の削除を行う(T12・T13)
	scheduled: async (_controller, env) => {
		await runScheduledPurge(env);
	},
};

export default worker;
