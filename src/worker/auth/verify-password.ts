import { createAuth } from "./index";

// Better Authに現在のパスワードだけを検証する公開APIが無いため、Better Auth自身が
// change-password(auth/api/routes/update-user.ts)で使っているのと同じ内部処理
// (internalAdapter.findCredentialAccount + password.verify)を使って照合する。
// メールアドレスの変更(T8)・退会(T10)の「現在のパスワードの確認」で共通に使う
export async function verifyCurrentPassword(env: Env, userId: string, password: string): Promise<boolean> {
	const auth = createAuth(env);
	const ctx = await auth.$context;
	const account = await ctx.internalAdapter.findCredentialAccount(userId);
	if (!account?.password) {
		return false;
	}
	return ctx.password.verify({ hash: account.password, password });
}
