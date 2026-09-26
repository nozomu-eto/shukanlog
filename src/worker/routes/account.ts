import { z } from "zod";
import { createAuth } from "../auth";
import { verifyCurrentPassword } from "../auth/verify-password";

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
