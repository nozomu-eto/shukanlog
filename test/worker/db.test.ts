import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

// D1バインディングと、テスト開始時のマイグレーション適用(apply-migrations.ts)が
// 正しく動作していることを確認する最小限のテスト
describe("D1バインディング", () => {
	it("クエリを実行できる", async () => {
		const result = await env.DB.prepare("SELECT 1 AS value").first<{ value: number }>();
		expect(result?.value).toBe(1);
	});
});
