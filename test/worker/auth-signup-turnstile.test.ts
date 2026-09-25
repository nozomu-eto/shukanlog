import { SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubTurnstileSiteverify } from "./support/turnstile";

describe("新規登録のTurnstile検証", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("トークンが無い場合は400を返す", async () => {
		const res = await SELF.fetch("https://example.com/api/auth/sign-up/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "no-token@example.com",
				password: "password123",
				name: "テスト",
			}),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toEqual({
			error: { code: "TURNSTILE_TOKEN_REQUIRED", message: "Turnstileトークンが必要です" },
		});
	});

	it("トークンが不正な場合は400を返す", async () => {
		stubTurnstileSiteverify(false);

		const res = await SELF.fetch("https://example.com/api/auth/sign-up/email", {
			method: "POST",
			headers: { "content-type": "application/json", "x-turnstile-token": "invalid-token" },
			body: JSON.stringify({
				email: "invalid-token@example.com",
				password: "password123",
				name: "テスト",
			}),
		});
		expect(res.status).toBe(400);
	});

	it("トークンが有効な場合は登録できる", async () => {
		stubTurnstileSiteverify(true);

		const res = await SELF.fetch("https://example.com/api/auth/sign-up/email", {
			method: "POST",
			headers: { "content-type": "application/json", "x-turnstile-token": "valid-token" },
			body: JSON.stringify({
				email: "valid-token@example.com",
				password: "password123",
				name: "テスト",
			}),
		});
		expect(res.status).toBeLessThan(300);
	});
});
