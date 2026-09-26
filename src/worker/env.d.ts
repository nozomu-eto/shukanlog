// wrangler.jsonのvarsではなく、wrangler secret(本番) / .dev.vars(開発)で設定する値の型
export {};

declare global {
	interface Env {
		readonly BETTER_AUTH_SECRET: string;
		readonly TURNSTILE_SECRET_KEY: string;
	}
	namespace Cloudflare {
		interface Env {
			readonly BETTER_AUTH_SECRET: string;
			readonly TURNSTILE_SECRET_KEY: string;
		}
	}
}
