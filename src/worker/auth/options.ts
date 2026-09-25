import type { BetterAuthOptions } from "better-auth";

// Better Authの共通オプション。実行時のインスタンス(auth/index.ts)と
// スキーマ生成専用の設定(auth/cli.config.ts)の両方から使う
export const authOptions = {
	emailAndPassword: {
		enabled: true,
		// メールアドレスの確認が済むまでログインさせない
		requireEmailVerification: true,
		minPasswordLength: 8,
	},
} satisfies Partial<BetterAuthOptions>;
