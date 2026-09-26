import { Hono } from "hono";
import { requireSession } from "../middleware/require-session";
import { requireConsent } from "../middleware/require-consent";
import { writeRateLimit } from "../middleware/write-rate-limit";
import type { AppEnv } from "../types";

// 認証・同意の確認が必要なAPIをまとめるルーター。src/worker/index.tsから /api にマウントする。
// (/api/health、/api/auth/* はこのルーターの外(index.ts)で処理する)
export const apiRouter = new Hono<AppEnv>();

// すべてのAPIでログインを必須にする
apiRouter.use("*", requireSession);

// 書き込み系のリクエストにユーザーID単位のレート制限をかける(requireSessionの後段。userIdに依存するため)
apiRouter.use("*", writeRateLimit);

// /api/me と /api/consent は、まだ利用規約に同意していない利用者も呼び出す必要があるため、
// この2つ以外だけ同意済みであることを必須にする
const PATHS_WITHOUT_CONSENT_CHECK = new Set(["/api/me", "/api/consent"]);
apiRouter.use("*", async (c, next) => {
	const path = new URL(c.req.url).pathname;
	if (PATHS_WITHOUT_CONSENT_CHECK.has(path)) {
		await next();
		return;
	}
	return requireConsent(c, next);
});

// 各APIのハンドラは、この後のタスク(T11以降)でこのルーターに追加していく
