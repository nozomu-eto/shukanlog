import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// Better Authのフロントエンド用クライアント。
// baseURLは省略すると既定で"/api/auth"になり、Workerのマウント先(src/worker/index.ts)と一致する。
// emailOTPClient()を入れることで authClient.emailOtp.* (確認コードの送信・検証・パスワード再設定)が使えるようになる
export const authClient = createAuthClient({
	plugins: [emailOTPClient()],
});

// 新規登録画面(サインアップ)のみ、リクエストヘッダーにTurnstileのトークンを付ける必要がある
// (サーバー側のturnstileMiddlewareがx-turnstile-tokenヘッダーを検証する)。
// authClientの各メソッドは (body, fetchOptions) の第2引数でfetchOptionsを渡せるため、
// headersにx-turnstile-tokenを含めて呼び出す
export function withTurnstileToken(token: string) {
	return { headers: { "x-turnstile-token": token } };
}

// authClientの各メソッドが返すerrorオブジェクトからエラーコードを取り出す。
// Better Auth自身のエラーはボディがフラットな{ code, message }だが、
// 新規登録のみ通るturnstileMiddleware(src/worker/middleware/turnstile.ts)は
// アプリの他のAPIと同じ{ error: { code, message } }の形で返すため、
// betterFetchのエラー(パースしたボディをそのままerrorへspreadする実装)だと
// この場合だけerror.codeではなくerror.error.codeにコードが入ってしまう。
// 呼び出し側でどちらの形でも判定できるよう、両方を見て取り出すヘルパーを用意する
export function getAuthErrorCode(error: unknown): string | undefined {
	if (!error || typeof error !== "object") {
		return undefined;
	}
	const record = error as Record<string, unknown>;
	if (typeof record.code === "string") {
		return record.code;
	}
	const nested = record.error;
	if (nested && typeof nested === "object" && typeof (nested as Record<string, unknown>).code === "string") {
		return (nested as Record<string, unknown>).code as string;
	}
	return undefined;
}
