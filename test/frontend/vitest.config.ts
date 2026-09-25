import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 画面・部品のテスト設定。jsdom + Testing Library で動かす
export default defineConfig({
	plugins: [react()],
	test: {
		name: "frontend",
		environment: "jsdom",
		include: ["**/*.test.{ts,tsx}"],
		setupFiles: ["./setup.ts"],
	},
});
