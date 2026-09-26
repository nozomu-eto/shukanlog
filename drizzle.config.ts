import { defineConfig } from "drizzle-kit";

// drizzle-kit の設定。D1(SQLite互換)のマイグレーションファイルを migrations/ に生成する
export default defineConfig({
	dialect: "sqlite",
	schema: "./src/worker/db/schema/index.ts",
	out: "./migrations",
});
