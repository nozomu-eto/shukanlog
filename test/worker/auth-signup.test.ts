import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

// 登録直後はメールアドレスが未確認のため、ログインできないことを確認する
describe("メールアドレス確認前のログイン", () => {
	it("登録はできるが、確認前はログインできない", async () => {
		const email = "signup-test@example.com";
		const password = "password123";

		const signUpRes = await SELF.fetch("https://example.com/api/auth/sign-up/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password, name: "テストユーザー" }),
		});
		expect(signUpRes.status).toBeLessThan(400);

		const signInRes = await SELF.fetch("https://example.com/api/auth/sign-in/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		expect(signInRes.status).toBeGreaterThanOrEqual(400);
		const body = await signInRes.json();
		expect(body).toHaveProperty("code");
	});
});
