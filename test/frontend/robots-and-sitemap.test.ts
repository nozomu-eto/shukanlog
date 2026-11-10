import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("public/robots.txt", () => {
	const content = readFileSync(path.join(process.cwd(), "public/robots.txt"), "utf-8");

	it("すべてのクローラーに/を許可し、/api/だけをDisallowにする", () => {
		expect(content).toContain("User-agent: *");
		expect(content).toContain("Allow: /");
		expect(content).toContain("Disallow: /api/");
	});

	it("/appなどをDisallowにしていない(X-Robots-Tagのnoindexをクローラーが読めるようにするため)", () => {
		expect(content).not.toContain("Disallow: /app");
		expect(content).not.toContain("Disallow: /login");
	});

	it("Sitemapの場所を示している", () => {
		expect(content).toContain("Sitemap: https://shukanlog.com/sitemap.xml");
	});
});

describe("public/sitemap.xml", () => {
	const content = readFileSync(path.join(process.cwd(), "public/sitemap.xml"), "utf-8");

	it("公開してよい5ページの絶対URLを含む", () => {
		expect(content).toContain("<loc>https://shukanlog.com/</loc>");
		expect(content).toContain("<loc>https://shukanlog.com/terms</loc>");
		expect(content).toContain("<loc>https://shukanlog.com/privacy</loc>");
		expect(content).toContain("<loc>https://shukanlog.com/licenses</loc>");
		expect(content).toContain("<loc>https://shukanlog.com/contact</loc>");
	});
});
