import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

// shukanlogでは使わない、コードだけでログインできるエンドポイントが閉じられていることを確認する
describe("使わないログインのエンドポイント", () => {
	it("POST /api/auth/sign-in/email-otp は404を返す", async () => {
		const res = await SELF.fetch("https://example.com/api/auth/sign-in/email-otp", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "test@example.com", otp: "123456" }),
		});
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Not Found" } });
	});
});
