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
import {
	createCalorieLogBodySchema,
	findOwnCalorieLog,
	isCalorieTrackingEnabled,
	patchCalorieLogBodySchema,
} from "./calorie-logs";
import { getDb } from "../db/client";
import { calorieLog, profile } from "../db/schema";
import { eq } from "drizzle-orm";
import { patchProfileBodySchema } from "./profile";
import { buildSummaryResponse, summaryQuerySchema, validateSummaryRange } from "./summary";
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

// カロリー記録を作成する
apiRouter.post("/calorie-logs", validate("json", createCalorieLogBodySchema), async (c) => {
	const userId = c.get("userId");
	const input = c.req.valid("json");

	if (!isValidDateString(input.date) || isFuture(input.date, todayInTokyo())) {
		return c.json({ error: { code: "VALIDATION_ERROR", message: "日付の指定が不正です" } }, 400);
	}
	if (!(await isCalorieTrackingEnabled(c.env, userId))) {
		return c.json(
			{
				error: {
					code: "CALORIE_TRACKING_DISABLED",
					message: "カロリー記録が無効になっています",
				},
			},
			403,
		);
	}

	const db = getDb(c.env);
	const id = crypto.randomUUID();
	await db.insert(calorieLog).values({
		id,
		userId,
		recordDate: input.date,
		calories: input.calories,
		note: input.note ?? null,
	});

	return c.json({ id, date: input.date, calories: input.calories, note: input.note ?? null }, 201);
});

// カロリー記録を更新する
apiRouter.patch("/calorie-logs/:id", validate("json", patchCalorieLogBodySchema), async (c) => {
	const userId = c.get("userId");
	const id = c.req.param("id");
	const input = c.req.valid("json");

	if (!(await isCalorieTrackingEnabled(c.env, userId))) {
		return c.json(
			{
				error: {
					code: "CALORIE_TRACKING_DISABLED",
					message: "カロリー記録が無効になっています",
				},
			},
			403,
		);
	}

	const existing = await findOwnCalorieLog(c.env, userId, id);
	if (!existing) {
		return c.json({ error: { code: "NOT_FOUND", message: "カロリー記録が見つかりません" } }, 404);
	}

	const db = getDb(c.env);
	await db
		.update(calorieLog)
		.set({
			calories: input.calories ?? existing.calories,
			note: input.note ?? existing.note,
			updatedAt: Date.now(),
		})
		.where(eq(calorieLog.id, id));

	return c.json({
		id,
		date: existing.recordDate,
		calories: input.calories ?? existing.calories,
		note: input.note ?? existing.note,
	});
});

// カロリー記録を削除する
apiRouter.delete("/calorie-logs/:id", async (c) => {
	const userId = c.get("userId");
	const id = c.req.param("id");

	if (!(await isCalorieTrackingEnabled(c.env, userId))) {
		return c.json(
			{
				error: {
					code: "CALORIE_TRACKING_DISABLED",
					message: "カロリー記録が無効になっています",
				},
			},
			403,
		);
	}

	const existing = await findOwnCalorieLog(c.env, userId, id);
	if (!existing) {
		return c.json({ error: { code: "NOT_FOUND", message: "カロリー記録が見つかりません" } }, 404);
	}

	const db = getDb(c.env);
	await db.delete(calorieLog).where(eq(calorieLog.id, id));

	return c.body(null, 204);
});

// カロリー記録の有効・無効を切り替える。無効にしても既存の記録は削除しない(再度有効にすれば表示される)
apiRouter.patch("/profile", validate("json", patchProfileBodySchema), async (c) => {
	const userId = c.get("userId");
	const { calorieTrackingEnabled } = c.req.valid("json");

	const db = getDb(c.env);
	await db
		.update(profile)
		.set({ calorieTrackingEnabled, updatedAt: Date.now() })
		.where(eq(profile.userId, userId));

	return c.json({ calorieTrackingEnabled });
});

// 週・月タブの集計を返す(習慣の記録・カロリー記録をまとめて1回のレスポンスで返す)
apiRouter.get("/summary", validate("query", summaryQuerySchema), async (c) => {
	const { from, to } = c.req.valid("query");
	const rangeError = validateSummaryRange(from, to);
	if (rangeError) {
		return c.json({ error: rangeError }, 400);
	}

	const body = await buildSummaryResponse(
		c.env,
		c.get("userId"),
		from,
		to,
		c.get("accountCreatedDate"),
		todayInTokyo(),
	);
	return c.json(body);
});

// 各APIのハンドラは、この後のタスク(T17以降)でこのルーターに追加していく
