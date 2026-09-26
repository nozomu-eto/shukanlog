import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

// wrangler.json の assets.run_worker_first を ["/api/*"] にしたため、
// このWorkerが処理するのは /api/ 配下のみ。静的ファイル(SPA本体・/assets/配下など)への
// ヘッダー付与は public/_headers の役割になり、その値との一致は
// test/frontend/security-headers-file.test.ts で確認する
describe("セキュリティヘッダ", () => {
	it("APIのレスポンスに付与される", async () => {
		const res = await SELF.fetch("https://example.com/api/health");
		expect(res.headers.get("Strict-Transport-Security")).toBe(
			"max-age=31536000; includeSubDomains",
		);
		expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
		expect(res.headers.get("X-Frame-Options")).toBe("DENY");
		expect(res.headers.get("Content-Security-Policy-Report-Only")).toContain(
			"default-src 'self'",
		);
	});
});
