import { SELF } from "cloudflare:test";
import { getSentMails, resetSentMails } from "../../../src/worker/lib/mailer";
import { stubTurnstileSiteverify } from "./turnstile";

function extractCode(text: string): string {
	const match = text.match(/確認コード: (\d{6})/);
	if (!match) {
		throw new Error(`確認コードが本文から見つかりません: ${text}`);
	}
	return match[1];
}

// リクエストのSet-CookieヘッダからCookieヘッダに使える文字列を取り出す
function extractCookieHeader(res: Response): string {
	const setCookie = res.headers.get("set-cookie");
	if (!setCookie) {
		throw new Error("Set-Cookieヘッダがありません");
	}
	// 複数のCookie属性(Path, HttpOnly等)が含まれるため、先頭の name=value 部分だけを取り出す
	return setCookie.split(";")[0];
}

// 利用者ごとに一意なIPアドレス(10.x.x.x の範囲)を発行する。
// Better Authのレート制限はcf-connecting-ipヘッダーのIPアドレスごとにカウンタが分かれるため、
// 呼び出しごとに別のIPアドレスを使うことで、レート制限自体は有効なまま
// (auth-rate-limit.test.tsで別途確認済み)、テストの利用者同士が互いのカウンタに影響しないようにする
function randomTestIp(): string {
	const octet = () => Math.floor(Math.random() * 254) + 1;
	return `10.${octet()}.${octet()}.${octet()}`;
}

// テスト用に、新規登録→メール確認→ログインまでを行い、セッションのCookieを取得する。
// 認証・同意が必要なAPIのテストで、ログイン済みの状態を作るために使う
export async function signUpAndSignIn(emailPrefix = "user"): Promise<{ email: string; cookie: string }> {
	resetSentMails();
	stubTurnstileSiteverify(true);
	const email = `${emailPrefix}-${crypto.randomUUID()}@example.com`;
	const password = "password123";
	// この利用者専用のIPアドレスを使うことで、同じテストファイル内で何度呼び出しても
	// 新規登録のレート制限(60秒に3回)に抵触しない
	const ip = randomTestIp();

	const signUpRes = await SELF.fetch("https://example.com/api/auth/sign-up/email", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-turnstile-token": "valid-token",
			"cf-connecting-ip": ip,
		},
		body: JSON.stringify({ email, password, name: "テストユーザー" }),
	});
	if (signUpRes.status >= 400) {
		throw new Error(`サインアップに失敗しました: ${signUpRes.status}`);
	}

	const sentMails = getSentMails();
	const otpMail = sentMails.find((mail) => mail.to === email);
	if (!otpMail) {
		throw new Error("確認コードのメールが送信されていません");
	}
	const code = extractCode(otpMail.text);

	const verifyRes = await SELF.fetch("https://example.com/api/auth/email-otp/verify-email", {
		method: "POST",
		headers: { "content-type": "application/json", "cf-connecting-ip": ip },
		body: JSON.stringify({ email, otp: code }),
	});
	if (verifyRes.status >= 400) {
		throw new Error(`メール確認に失敗しました: ${verifyRes.status}`);
	}

	const signInRes = await SELF.fetch("https://example.com/api/auth/sign-in/email", {
		method: "POST",
		headers: { "content-type": "application/json", "cf-connecting-ip": ip },
		body: JSON.stringify({ email, password }),
	});
	if (signInRes.status >= 400) {
		throw new Error(`ログインに失敗しました: ${signInRes.status}`);
	}

	return { email, cookie: extractCookieHeader(signInRes) };
}
