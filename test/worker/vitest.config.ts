import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// API のテスト設定。@cloudflare/vitest-plugin により、実際の Workers ランタイム上でテストを動かす
export default defineConfig({
	plugins: [
		cloudflareTest(() => ({
			wrangler: { configPath: path.join(dirname, "../../wrangler.json") },
		})),
	],
	test: {
		name: "worker",
		include: ["**/*.test.ts"],
	},
});
