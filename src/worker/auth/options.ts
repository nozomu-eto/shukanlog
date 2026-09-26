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
	emailVerification: {
		// メール確認(確認コードの検証)に成功したら、そのままセッションを発行してログイン済みにする。
		// 新規登録直後にログイン画面へ戻さず、そのまま利用規約への同意画面(/consent)へ進めるため
		autoSignInAfterVerification: true,
	},
	// レート制限。メモリ保存だとWorkerのisolateごとにカウンタが分かれ実質効かないため、
	// D1(database)に保存する(既知の落とし穴2)
	rateLimit: {
		enabled: true,
		storage: "database",
		window: 60,
		max: 100,
		customRules: {
			// ログイン: 60秒に5回
			"/sign-in/email": { window: 60, max: 5 },
			// 新規登録: 60秒に3回
			"/sign-up/email": { window: 60, max: 3 },
			// 確認コードの送信・再送: 60秒に1回
			"/email-otp/send-verification-otp": { window: 60, max: 1 },
			// コードの検証: 60秒に5回
			"/email-otp/verify-email": { window: 60, max: 5 },
			// パスワード再設定(コードでの確定。OTP検証を兼ねるため検証と同じ回数にしている): 60秒に5回
			"/email-otp/reset-password": { window: 60, max: 5 },
			// パスワード再設定の要求: 300秒に3回
			"/email-otp/request-password-reset": { window: 300, max: 3 },
		},
	},
	advanced: {
		// IPアドレスの取得には cf-connecting-ip ヘッダーを使う(既知の落とし穴2)
		ipAddress: {
			ipAddressHeaders: ["cf-connecting-ip"],
		},
	},
} satisfies Partial<BetterAuthOptions>;
