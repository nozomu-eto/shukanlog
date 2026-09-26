import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

// /api/health が 200 を返すことを確認する最小限のテスト
describe("GET /api/health", () => {
	it("200を返す", async () => {
		const res = await SELF.fetch("https://example.com/api/health");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ status: "ok" });
	});
});
