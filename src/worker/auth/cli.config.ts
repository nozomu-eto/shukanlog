import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { authOptions } from "./options";
import { createEmailOTPPlugin } from "./plugins";

// `npx auth generate` でスキーマ(マイグレーション用のdrizzle定義)を生成するための専用設定。
// D1へは実際に接続しない(スキーマの形を決めるためだけに使う)ため、アプリのコードからは読み込まない
export const auth = betterAuth({
	...authOptions,
	baseURL: "http://localhost:5173",
	secret: "cli-schema-generation-only",
	database: drizzleAdapter(drizzle({} as D1Database), {
		provider: "sqlite",
	}),
	plugins: [createEmailOTPPlugin({ async send() {} })],
});
