import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { createAuth } from "../auth";
import { verifyCurrentPassword } from "../auth/verify-password";
import { getDb } from "../db/client";
import { accountDeletion } from "../db/schema";

// 退会後、物理削除するまでデータを保管する日数(docs/design.md 9章)
const WITHDRAWAL_RETENTION_DAYS = 30;

// POST /api/account/email/request-change のリクエストボディ
export const requestEmailChangeBodySchema = z.object({
	newEmail: z.string().email(),
	currentPassword: z.string().min(1),
});

export type RequestEmailChangeResult =
	| { ok: true }
	| { ok: false; status: 400; code: "VALIDATION_ERROR" | "INVALID_PASSWORD" | "EMAIL_ALREADY_IN_USE"; message: string };

// メールアドレスの変更の申請(新しいメールアドレスへ確認コードを送る)。
// Better Authのemail-otpプラグインのrequestEmailChangeEmailOTPは、現在のパスワードの確認手段を
// 持たず(verifyCurrentEmailは現メールへのOTP確認のオプションで、パスワードとは異なる)、
// 既に使われているメールアドレスの場合もコードを送らずに黙ってsuccess:trueを返す(存在の漏えい防止のため)。
// docs/progress/step4.mdの通り、shukanlogでは現在のパスワードの確認と、既に使われているメール
// アドレスへの明示的なエラー表示を仕様とするため、その2点をこの関数で先に行ってから
// Better Auth本体の処理(コードの生成・送信)を呼び出す
export async function requestEmailChange(
	env: Env,
	userId: string,
	currentEmail: string,
	newEmail: string,
	currentPassword: string,
	headers: Headers,
): Promise<RequestEmailChangeResult> {
	const normalizedNewEmail = newEmail.toLowerCase();
	if (normalizedNewEmail === currentEmail.toLowerCase()) {
		return { ok: false, status: 400, code: "VALIDATION_ERROR", message: "現在のメールアドレスと同じです" };
	}

	if (!(await verifyCurrentPassword(env, userId, currentPassword))) {
		return { ok: false, status: 400, code: "INVALID_PASSWORD", message: "現在のパスワードが正しくありません" };
	}

	const auth = createAuth(env);
	const ctx = await auth.$context;
	if (await ctx.internalAdapter.findUserByEmail(normalizedNewEmail)) {
		return {
			ok: false,
			status: 400,
			code: "EMAIL_ALREADY_IN_USE",
			message: "そのメールアドレスは既に使われています",
		};
	}

	// Better Auth本体の処理(確認コードの生成・送信)を呼び出す。headersを渡すことで
	// セッション(sensitiveSessionMiddleware)をリクエストのCookieから解決させる
	await auth.api.requestEmailChangeEmailOTP({ body: { newEmail: normalizedNewEmail }, headers });

	return { ok: true };
}

// POST /api/account/withdraw のリクエストボディ
export const withdrawBodySchema = z.object({
	currentPassword: z.string().min(1),
});

export type WithdrawResult =
	| { ok: true }
	| { ok: false; status: 400; code: "INVALID_PASSWORD"; message: string };

// 退会の申請。docs/design.md 9章の通り、即時に論理削除(セッションをすべて無効にする)し、
// 30日後の物理削除は定期処理(T12)に委ねる。データ自体はこの時点では削除しない。
// 30日以内に同じメールアドレス・パスワードでログインすると、databaseHooks(auth/index.ts)が
// 取り消し(canceledAt)を記録する
export async function withdraw(env: Env, userId: string, currentPassword: string): Promise<WithdrawResult> {
	if (!(await verifyCurrentPassword(env, userId, currentPassword))) {
		return { ok: false, status: 400, code: "INVALID_PASSWORD", message: "現在のパスワードが正しくありません" };
	}

	const db = getDb(env);
	const requestedAt = Date.now();
	const purgeAfter = requestedAt + WITHDRAWAL_RETENTION_DAYS * 24 * 60 * 60 * 1000;
	await db.insert(accountDeletion).values({ id: crypto.randomUUID(), userId, requestedAt, purgeAfter });

	// この利用者のすべてのセッションを無効にする(即時ログアウト)
	const auth = createAuth(env);
	const ctx = await auth.$context;
	await ctx.internalAdapter.deleteUserSessions(userId);

	return { ok: true };
}

// ログイン成功時(databaseHooks.session.create.after)に呼ぶ。取り消されておらず、
// まだ物理削除されていない(purgeAfterを過ぎていない)退会の申請があれば取り消す
export async function cancelPendingWithdrawal(env: Env, userId: string): Promise<void> {
	const db = getDb(env);
	const now = Date.now();
	const pending = await db.query.accountDeletion.findFirst({
		where: and(eq(accountDeletion.userId, userId), isNull(accountDeletion.canceledAt)),
	});
	if (!pending || pending.purgeAfter <= now) {
		return;
	}
	await db.update(accountDeletion).set({ canceledAt: now }).where(eq(accountDeletion.id, pending.id));
}
