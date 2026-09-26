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
