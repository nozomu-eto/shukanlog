import { Hono } from "hono";
import { requireSession } from "../middleware/require-session";
import { requireConsent } from "../middleware/require-consent";
import { writeRateLimit } from "../middleware/write-rate-limit";
import { validate } from "../lib/validation";
import { buildMeResponse } from "./me";
import { consentBodySchema } from "./consent";
import { ensureConsentAndInitialData } from "../db/ensure-initial-data";
import { buildDayResponse } from "./days";
import { habitLogBodySchema, putHabitLog } from "./habit-logs";
import { POLICY_VERSION } from "../../shared/policy";
import { isFuture, isValidDateString, todayInTokyo } from "../../shared/domain/date";
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

// 自分の情報(ログイン中の利用者のメールアドレス・アカウント作成日・プロフィール・同意状況)を返す。
// requireConsentの対象外(まだ同意していない利用者も呼び出す必要があるため)
apiRouter.get("/me", async (c) => {
	const body = await buildMeResponse(
		c.env,
		c.get("userId"),
		c.get("userEmail"),
		c.get("accountCreatedDate"),
	);
	return c.json(body);
});

// 利用規約・プライバシーポリシーへの同意を記録する。同意していなければ初期データ(プロフィール・習慣)を作成する。
// requireConsentの対象外(同意そのものを行うエンドポイントのため)
apiRouter.post("/consent", validate("json", consentBodySchema), async (c) => {
	const { policyVersion } = c.req.valid("json");
	if (policyVersion !== POLICY_VERSION) {
		return c.json(
			{ error: { code: "VALIDATION_ERROR", message: "利用規約のバージョンが古いか不正です" } },
			400,
		);
	}

	await ensureConsentAndInitialData(c.env, c.get("userId"));

	const body = await buildMeResponse(
		c.env,
		c.get("userId"),
		c.get("userEmail"),
		c.get("accountCreatedDate"),
	);
	return c.json(body);
});

// 指定した日の記録(習慣の記録・カロリー記録)を返す。
// dateが不正な形式、または日本時間の今日より後(未来)の場合は400にする
apiRouter.get("/days/:date", async (c) => {
	const date = c.req.param("date");
	if (!isValidDateString(date) || isFuture(date, todayInTokyo())) {
		return c.json(
			{ error: { code: "VALIDATION_ERROR", message: "日付の指定が不正です" } },
			400,
		);
	}

	const body = await buildDayResponse(c.env, c.get("userId"), date);
	return c.json(body);
});

// 習慣の記録を作成・更新・取り消す(resultがnullなら取り消し=未記録に戻す)
apiRouter.put("/habit-logs", validate("json", habitLogBodySchema), async (c) => {
	const input = c.req.valid("json");
	if (!isValidDateString(input.date) || isFuture(input.date, todayInTokyo())) {
		return c.json(
			{ error: { code: "VALIDATION_ERROR", message: "日付の指定が不正です" } },
			400,
		);
	}

	const result = await putHabitLog(c.env, c.get("userId"), input);
	if (!result.ok) {
		return c.json({ error: { code: result.code, message: result.message } }, result.status);
	}
	return c.json(result.body);
});

// 各APIのハンドラは、この後のタスク(T14以降)でこのルーターに追加していく
