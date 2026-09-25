import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { getSentMails, resetSentMails } from "../../src/worker/lib/mailer";

async function signUp(email: string, password: string) {
	return SELF.fetch("https://example.com/api/auth/sign-up/email", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email, password, name: "テストユーザー" }),
	});
}

function extractCode(text: string): string {
	const match = text.match(/確認コード: (\d{6})/);
	if (!match) {
		throw new Error(`確認コードが本文から見つかりません: ${text}`);
	}
	return match[1];
}

describe("6桁の確認コードによるメール確認", () => {
	beforeEach(() => {
		resetSentMails();
	});

	it("登録→コードが送信される→コードで確認→ログインできる", async () => {
		const email = `otp-${crypto.randomUUID()}@example.com`;
		const password = "password123";

		const signUpRes = await signUp(email, password);
		expect(signUpRes.status).toBeLessThan(400);

		const sentMails = getSentMails();
		expect(sentMails).toHaveLength(1);
		expect(sentMails[0].to).toBe(email);
		expect(sentMails[0].subject).toBe("【shukanlog】メールアドレス確認コード");

		const code = extractCode(sentMails[0].text);

		const verifyRes = await SELF.fetch("https://example.com/api/auth/email-otp/verify-email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, otp: code }),
		});
		expect(verifyRes.status).toBe(200);

		const signInRes = await SELF.fetch("https://example.com/api/auth/sign-in/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password }),
		});
		expect(signInRes.status).toBe(200);
	});

	it("誤ったコードでは確認できない", async () => {
		const email = `otp-wrong-${crypto.randomUUID()}@example.com`;
		await signUp(email, "password123");

		const verifyRes = await SELF.fetch("https://example.com/api/auth/email-otp/verify-email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, otp: "000000" }),
		});
		expect(verifyRes.status).toBeGreaterThanOrEqual(400);
	});

	it("パスワード再設定: コードの要求→コードで再設定→新しいパスワードでログインできる", async () => {
		const email = `reset-${crypto.randomUUID()}@example.com`;
		await signUp(email, "old-password123");

		const requestRes = await SELF.fetch(
			"https://example.com/api/auth/email-otp/request-password-reset",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email }),
			},
		);
		expect(requestRes.status).toBe(200);

		const sentMails = getSentMails();
		const resetMail = sentMails.find((mail) => mail.subject === "【shukanlog】パスワード再設定コード");
		expect(resetMail).toBeDefined();
		const code = extractCode(resetMail!.text);

		const newPassword = "new-password456";
		const resetRes = await SELF.fetch("https://example.com/api/auth/email-otp/reset-password", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, otp: code, password: newPassword }),
		});
		expect(resetRes.status).toBe(200);

		const signInRes = await SELF.fetch("https://example.com/api/auth/sign-in/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password: newPassword }),
		});
		expect(signInRes.status).toBe(200);
	});
});
