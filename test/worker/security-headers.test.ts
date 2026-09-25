import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

function expectSecurityHeaders(res: Response) {
	expect(res.headers.get("Strict-Transport-Security")).toBe(
		"max-age=31536000; includeSubDomains",
	);
	expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
	expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
	expect(res.headers.get("X-Frame-Options")).toBe("DENY");
	expect(res.headers.get("Content-Security-Policy-Report-Only")).toContain("default-src 'self'");
}

describe("セキュリティヘッダ", () => {
	it("APIのレスポンスに付与される", async () => {
		const res = await SELF.fetch("https://example.com/api/health");
		expectSecurityHeaders(res);
	});

	it("SPAのindex.htmlに付与される", async () => {
		const res = await SELF.fetch("https://example.com/");
		expectSecurityHeaders(res);
	});

	it("存在しないパスへのアクセスにも付与される", async () => {
		const res = await SELF.fetch("https://example.com/no-such-page");
		expectSecurityHeaders(res);
	});

	it("アセット(/assets/配下)に長期キャッシュのヘッダが付く", async () => {
		const res = await SELF.fetch("https://example.com/assets/does-not-matter.js");
		expectSecurityHeaders(res);
		expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
	});
});
