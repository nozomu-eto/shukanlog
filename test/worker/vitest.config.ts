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
					bindings: {
						TEST_MIGRATIONS: migrations,
						// BETTER_AUTH_SECRETはwrangler secretで設定するシークレットのため、テストではここで補う
						BETTER_AUTH_SECRET: "test-only-secret-do-not-use-in-production-32chars",
						// テストではメール送信を実際には行わず、内容を記録するmemory実装を使う
						MAIL_TRANSPORT: "memory",
						// TURNSTILE_SECRET_KEYもwrangler secretで設定するシークレットのため、テストではここで補う
						// (実際の値はテストごとにfetchのモックで検証結果を制御する)
						TURNSTILE_SECRET_KEY: "test-only-turnstile-secret",
					},
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
