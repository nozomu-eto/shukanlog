import type { MiddlewareHandler } from "hono";

// shukanlogでは使わないBetter Auth(emailOTPプラグイン)のエンドポイント。
// emailOTPプラグインを入れると、メールのコードだけでログインできるエンドポイントも
// 有効になってしまうが、shukanlogではメールアドレス・パスワードでのログインのみを使うため、
// Better Authに処理させる前にHonoで404を返して閉じる。
// (node_modules/better-auth/dist/plugins/email-otp/routes.mjsのcreateAuthEndpoint呼び出しを
// 実際に確認し、パスワード無しでログインできるエンドポイントはこの1つだけであることを確認した)
const DISABLED_AUTH_PATHS = new Set(["/api/auth/sign-in/email-otp"]);

// 閉じたエンドポイントへのアクセスに404を返すミドルウェア
export const disabledAuthEndpointsMiddleware: MiddlewareHandler = async (c, next) => {
	if (DISABLED_AUTH_PATHS.has(new URL(c.req.url).pathname)) {
		return c.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, 404);
	}
	await next();
};
