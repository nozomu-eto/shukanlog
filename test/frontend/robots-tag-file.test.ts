import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// public/_headers を、Cloudflareの解析と同じように「インデントされていない行=パス、
// インデントされている行=そのパスに付くヘッダー」の対応でパースし、
// ログイン後・認証まわりの画面にX-Robots-Tag: noindexが付いていること、
// 公開してよいページには付いていないことを確認する
const headersFilePath = path.join(process.cwd(), "public/_headers");
const headersFileContent = readFileSync(headersFilePath, "utf-8");

function headersForPath(targetPath: string): string[] {
	const lines = headersFileContent.split("\n");
	const headers: string[] = [];
	let currentPath: string | null = null;
	for (const rawLine of lines) {
		if (rawLine.trim() === "" || rawLine.trim().startsWith("#")) {
			continue;
		}
		if (!rawLine.startsWith(" ") && !rawLine.startsWith("\t")) {
			currentPath = rawLine.trim();
			continue;
		}
		if (currentPath === targetPath) {
			headers.push(rawLine.trim());
		}
	}
	return headers;
}

describe("public/_headers のX-Robots-Tag", () => {
	it.each(["/app", "/app/*", "/login", "/signup", "/verify", "/reset", "/reset/*", "/consent"])(
		"%s にX-Robots-Tag: noindexが付いている",
		(targetPath) => {
			expect(headersForPath(targetPath)).toContain("X-Robots-Tag: noindex");
		},
	);

	it.each(["/*", "/terms", "/privacy", "/licenses"])("%s にはX-Robots-Tagが付いていない", (targetPath) => {
		const headers = headersForPath(targetPath);
		expect(headers.some((h) => h.startsWith("X-Robots-Tag"))).toBe(false);
	});
});
