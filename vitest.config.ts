import { defineConfig } from "vitest/config";

// Worker用(実際のWorkersランタイムで動かす)とフロントエンド用(jsdom)の
// 2つのプロジェクトをまとめて実行するためのルート設定
export default defineConfig({
	test: {
		projects: ["test/worker/vitest.config.ts", "test/frontend/vitest.config.ts"],
	},
});
