import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// 書き込み系(POST/PUT/PATCH/DELETE)にユーザーID単位のレート制限をかけるミドルウェア。
// requireSessionの後段で使う(c.get("userId")に依存する)。
// Workers Rate Limitingバインディング(API_RATE_LIMITER)を使う。上限はwrangler.jsonで設定する
export const writeRateLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
	if (!WRITE_METHODS.has(c.req.method)) {
		await next();
		return;
	}

	const userId = c.get("userId");
	const { success } = await c.env.API_RATE_LIMITER.limit({ key: userId });
	if (!success) {
		return c.json(
			{ error: { code: "RATE_LIMITED", message: "リクエストが多すぎます。しばらく待ってから再度お試しください" } },
			429,
		);
	}

	await next();
};
