import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// D1バインディングからdrizzleのクライアントを作る。Workerではリクエストごとにenvを受け取って呼び出す
export function getDb(env: Env) {
	return drizzle(env.DB, { schema });
}
