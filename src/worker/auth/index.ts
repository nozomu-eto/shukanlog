import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db/client";
import { authOptions } from "./options";

// Workerではリクエストごとにenv(D1バインディングなど)が異なるため、
// Better Authのインスタンスはモジュールスコープの単一インスタンスにせず、リクエストごとに作る
export function createAuth(env: Env) {
	return betterAuth({
		...authOptions,
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(getDb(env), {
			provider: "sqlite",
		}),
	});
}
