import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db/client";
import { createMailer } from "../lib/mailer";
import { authOptions } from "./options";
import { createEmailOTPPlugin } from "./plugins";
import { cancelPendingWithdrawal } from "../routes/account";

// Workerではリクエストごとにenv(D1バインディングなど)が異なるため、
// Better Authのインスタンスはモジュールスコープの単一インスタンスにせず、リクエストごとに作る
export function createAuth(env: Env) {
	return betterAuth({
		...authOptions,
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(getDb(env), {
			provider: "sqlite",
		}),
		plugins: [createEmailOTPPlugin(createMailer(env))],
		// ログイン成功(セッションの新規作成)ごとに、退会の申請中であれば取り消す(docs/design.md 9章)。
		// パスワード変更時の再発行等、新規登録以外の理由でのセッション作成でも呼ばれるが、
		// 退会申請が無い(または既に取り消し済み・物理削除の期限を過ぎている)場合はcancelPendingWithdrawal内で何もしない
		databaseHooks: {
			session: {
				create: {
					after: async (session) => {
						await cancelPendingWithdrawal(env, session.userId);
					},
				},
			},
		},
	});
}
