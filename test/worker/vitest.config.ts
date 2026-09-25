import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// API のテスト設定。@cloudflare/vitest-plugin により、実際の Workers ランタイム上でテストを動かす
export default defineConfig({
	plugins: [
		cloudflareTest(async () => {
			// migrations/ の内容を読み込み、テスト実行時にD1へ適用できるようにバインディングへ渡す
			const migrationsPath = path.join(dirname, "../../migrations");
			const migrations = await readD1Migrations(migrationsPath);

			return {
				wrangler: { configPath: path.join(dirname, "../../wrangler.json") },
				miniflare: {
					bindings: { TEST_MIGRATIONS: migrations },
				},
			};
		}),
	],
	test: {
		name: "worker",
		include: ["**/*.test.ts"],
		setupFiles: [path.join(dirname, "apply-migrations.ts")],
	},
});
