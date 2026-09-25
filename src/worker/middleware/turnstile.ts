import type { MiddlewareHandler } from "hono";
import { verifyTurnstileToken } from "../lib/turnstile";

// 新規登録(/api/auth/sign-up/email)のみに適用するbot対策ミドルウェア。
// トークンが無い・検証に失敗した場合は400を返す
export const turnstileMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
	const token = c.req.header("x-turnstile-token");
	if (!token) {
		return c.json(
			{ error: { code: "TURNSTILE_TOKEN_REQUIRED", message: "Turnstileトークンが必要です" } },
			400,
		);
	}

	const verified = await verifyTurnstileToken({
		token,
		secretKey: c.env.TURNSTILE_SECRET_KEY,
		remoteIp: c.req.header("cf-connecting-ip"),
	});
	if (!verified) {
		return c.json(
			{ error: { code: "TURNSTILE_VERIFICATION_FAILED", message: "Turnstileの検証に失敗しました" } },
			400,
		);
	}

	await next();
};
