import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { getSentMails, resetSentMails } from "../../src/worker/lib/mailer";
import { signUpAndSignIn } from "./support/auth";
import { POLICY_VERSION } from "../../src/shared/policy";

const PASSWORD = "password123";

function extractCode(text: string): string {
	const match = text.match(/確認コード: (\d{6})/);
	if (!match) {
		throw new Error(`確認コードが本文から見つかりません: ${text}`);
	}
	return match[1];
}

async function agreeToConsent(cookie: string) {
	const res = await SELF.fetch("https://example.com/api/consent", {
		method: "POST",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify({ policyVersion: POLICY_VERSION }),
	});
	if (res.status !== 200) {
		throw new Error(`同意に失敗しました: ${res.status}`);
	}
}

describe("メールアドレスの変更", () => {
	it("誤ったパスワードでは確認コードが送信されない", async () => {
		const { cookie } = await signUpAndSignIn("email-change-a");
		await agreeToConsent(cookie);
		resetSentMails();

		const res = await SELF.fetch("https://example.com/api/account/email/request-change", {
			method: "POST",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ newEmail: "new-a@example.com", currentPassword: "wrong-password" }),
		});

		expect(res.status).toBe(400);
		expect((await res.json<{ error: { code: string } }>()).error.code).toBe("INVALID_PASSWORD");
		expect(getSentMails()).toHaveLength(0);
	});

	it("既に使われているメールアドレスにはコードを送らずエラーになる", async () => {
		const { email: otherEmail } = await signUpAndSignIn("email-change-existing");
		const { cookie } = await signUpAndSignIn("email-change-b");
		await agreeToConsent(cookie);
		resetSentMails();

		const res = await SELF.fetch("https://example.com/api/account/email/request-change", {
			method: "POST",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ newEmail: otherEmail, currentPassword: PASSWORD }),
		});

		expect(res.status).toBe(400);
		expect((await res.json<{ error: { code: string } }>()).error.code).toBe("EMAIL_ALREADY_IN_USE");
		expect(getSentMails()).toHaveLength(0);
	});

	it("確認コードの検証前はメールアドレスが変わらず、検証後に変わって新しいアドレスでログインできる", async () => {
		const { email, cookie } = await signUpAndSignIn("email-change-c");
		await agreeToConsent(cookie);
		const newEmail = `new-${crypto.randomUUID()}@example.com`;
		resetSentMails();

		const requestRes = await SELF.fetch("https://example.com/api/account/email/request-change", {
			method: "POST",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ newEmail, currentPassword: PASSWORD }),
		});
		expect(requestRes.status).toBe(200);

		const otpMail = getSentMails().find((mail) => mail.to === newEmail);
		if (!otpMail) {
			throw new Error("確認コードのメールが送信されていません");
		}
		const code = extractCode(otpMail.text);

		// 検証前は、GET /api/me が今のメールアドレスのままであることを返す
		const meBeforeRes = await SELF.fetch("https://example.com/api/me", { headers: { cookie } });
		expect((await meBeforeRes.json<{ user: { email: string } }>()).user.email).toBe(email);

		// email-otp/change-emailはセッションのCookieを使う書き込み系のため、Better AuthはOrigin
		// ヘッダーを必須にしている(BETTER_AUTH_URLと一致する必要がある)
		const changeRes = await SELF.fetch("https://example.com/api/auth/email-otp/change-email", {
			method: "POST",
			headers: { cookie, "content-type": "application/json", origin: "http://localhost:5173" },
			body: JSON.stringify({ newEmail, otp: code }),
		});
		expect(changeRes.status).toBe(200);

		// 検証後は新しいメールアドレスでログインできる(古いメールアドレスではログインできない)
		const signInOldRes = await SELF.fetch("https://example.com/api/auth/sign-in/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password: PASSWORD }),
		});
		expect(signInOldRes.status).toBeGreaterThanOrEqual(400);

		const signInNewRes = await SELF.fetch("https://example.com/api/auth/sign-in/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: newEmail, password: PASSWORD }),
		});
		expect(signInNewRes.status).toBe(200);
	});
});
