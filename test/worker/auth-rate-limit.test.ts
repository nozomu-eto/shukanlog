import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

async function attemptLogin(email: string, ip: string) {
	return SELF.fetch("https://example.com/api/auth/sign-in/email", {
		method: "POST",
		headers: { "content-type": "application/json", "cf-connecting-ip": ip },
		body: JSON.stringify({ email, password: "wrong-password" }),
	});
}

describe("ログインのレート制限", () => {
	it("同じIPから60秒に6回目のログイン試行は429になる", async () => {
		const email = "rate-limit-test@example.com";
		const ip = "203.0.113.10";

		const results: number[] = [];
		for (let i = 0; i < 6; i++) {
			const res = await attemptLogin(email, ip);
			results.push(res.status);
		}

		expect(results.slice(0, 5).every((status) => status !== 429)).toBe(true);
		expect(results[5]).toBe(429);
	});

	it("別のIPからのログイン試行は影響を受けない", async () => {
		const email = "rate-limit-test-2@example.com";
		const blockedIp = "203.0.113.20";
		const otherIp = "203.0.113.21";

		for (let i = 0; i < 6; i++) {
			await attemptLogin(email, blockedIp);
		}
		// blockedIpは制限に達しているはず
		const blockedRes = await attemptLogin(email, blockedIp);
		expect(blockedRes.status).toBe(429);

		// 別IPはまだ制限に達していない
		const otherRes = await attemptLogin(email, otherIp);
		expect(otherRes.status).not.toBe(429);
	});
});
