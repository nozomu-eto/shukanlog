import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { signUpAndSignIn } from "./support/auth";

const PASSWORD = "password123";
const NEW_PASSWORD = "newpassword456";

function extractCookieHeader(res: Response): string {
	const setCookie = res.headers.get("set-cookie");
	if (!setCookie) {
		throw new Error("Set-Cookieヘッダがありません");
	}
	return setCookie.split(";")[0];
}

describe("パスワードの変更", () => {
	it("変更後、ほかの端末のセッションは無効になり、今の端末はログインしたまま新しいパスワードでログインできる", async () => {
		const { email, cookie: cookie1 } = await signUpAndSignIn("password-change-a");

		// 別の端末を想定して、もう一度ログインしてセッションを1つ増やす
		const signInAgainRes = await SELF.fetch("https://example.com/api/auth/sign-in/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password: PASSWORD }),
		});
		expect(signInAgainRes.status).toBe(200);
		const cookieOtherDevice = extractCookieHeader(signInAgainRes);

		// 今の端末(cookie1)からパスワードを変更する。他の端末のセッションを無効にするオプションを有効にする
		const changeRes = await SELF.fetch("https://example.com/api/auth/change-password", {
			method: "POST",
			headers: { cookie: cookie1, "content-type": "application/json", origin: "http://localhost:5173" },
			body: JSON.stringify({
				currentPassword: PASSWORD,
				newPassword: NEW_PASSWORD,
				revokeOtherSessions: true,
			}),
		});
		expect(changeRes.status).toBe(200);
		// revokeOtherSessionsは自分自身のセッションも含めて全セッションを無効にしたうえで、
		// この呼び出し自体に新しいセッションを発行するため、今の端末用の新しいCookieを受け取る
		const cookieThisDeviceAfterChange = extractCookieHeader(changeRes);

		// 他の端末のセッションは無効になっている
		const otherDeviceMeRes = await SELF.fetch("https://example.com/api/me", {
			headers: { cookie: cookieOtherDevice },
		});
		expect(otherDeviceMeRes.status).toBe(401);

		// 今の端末は、変更時に発行された新しいCookieでログインしたままになっている
		const thisDeviceMeRes = await SELF.fetch("https://example.com/api/me", {
			headers: { cookie: cookieThisDeviceAfterChange },
		});
		expect(thisDeviceMeRes.status).toBe(200);

		// 古いパスワードではログインできず、新しいパスワードでログインできる
		const signInOldRes = await SELF.fetch("https://example.com/api/auth/sign-in/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password: PASSWORD }),
		});
		expect(signInOldRes.status).toBeGreaterThanOrEqual(400);

		const signInNewRes = await SELF.fetch("https://example.com/api/auth/sign-in/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password: NEW_PASSWORD }),
		});
		expect(signInNewRes.status).toBe(200);
	});

	it("誤った現在のパスワードではエラーになる", async () => {
		const { cookie } = await signUpAndSignIn("password-change-b");

		const res = await SELF.fetch("https://example.com/api/auth/change-password", {
			method: "POST",
			headers: { cookie, "content-type": "application/json", origin: "http://localhost:5173" },
			body: JSON.stringify({
				currentPassword: "wrong-password",
				newPassword: NEW_PASSWORD,
				revokeOtherSessions: true,
			}),
		});

		expect(res.status).toBeGreaterThanOrEqual(400);
		const body = await res.json<{ code?: string }>();
		expect(body.code).toBe("INVALID_PASSWORD");
	});
});
