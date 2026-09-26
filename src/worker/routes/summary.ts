import { z } from "zod";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../db/client";
import { calorieLog, habit, habitLog } from "../db/schema";
import { isCalorieTrackingEnabled } from "./calorie-logs";
import { countEligibleDays } from "../../shared/domain/period";
import { isValidDateString, shiftDays } from "../../shared/domain/date";

// GET /api/summary のクエリパラメータ
export const summaryQuerySchema = z.object({
	from: z.string(),
	to: z.string(),
});

const MAX_PERIOD_DAYS = 42;

// 期間(from〜to、両端含む)の日数を計算する
function countPeriodDays(from: string, to: string): number {
	const [fy, fm, fd] = from.split("-").map(Number);
	const [ty, tm, td] = to.split("-").map(Number);
	const fromUtc = Date.UTC(fy, fm - 1, fd);
	const toUtc = Date.UTC(ty, tm - 1, td);
	return Math.round((toUtc - fromUtc) / (24 * 60 * 60 * 1000)) + 1;
}

export type SummaryValidationError = { code: "VALIDATION_ERROR"; message: string };

// from・toの妥当性を確認する。不正なら理由を返し、問題なければnullを返す
export function validateSummaryRange(from: string, to: string): SummaryValidationError | null {
	if (!isValidDateString(from) || !isValidDateString(to)) {
		return { code: "VALIDATION_ERROR", message: "日付の指定が不正です" };
	}
	if (from > to) {
		return { code: "VALIDATION_ERROR", message: "fromはto以前の日付である必要があります" };
	}
	if (countPeriodDays(from, to) > MAX_PERIOD_DAYS) {
		return { code: "VALIDATION_ERROR", message: `期間は最大${MAX_PERIOD_DAYS}日までです` };
	}
	return null;
}

// GET /api/summary のレスポンスを組み立てる。
// 習慣・習慣の記録・カロリー記録をそれぞれ1クエリで取得し、日ごとに個別のクエリは発行しない
export async function buildSummaryResponse(
	env: Env,
	userId: string,
	from: string,
	to: string,
	accountCreatedDate: string,
	today: string,
) {
	const db = getDb(env);

	const habits = await db.query.habit.findMany({
		where: and(eq(habit.userId, userId), eq(habit.status, "active")),
		orderBy: (t, { asc }) => asc(t.sortOrder),
	});
	const habitIds = new Set(habits.map((h) => h.id));

	const habitLogsInRange = await db.query.habitLog.findMany({
		where: and(
			eq(habitLog.userId, userId),
			gte(habitLog.recordDate, from),
			lte(habitLog.recordDate, to),
		),
	});

	const calorieTrackingEnabled = await isCalorieTrackingEnabled(env, userId);
	const calorieLogsInRange = calorieTrackingEnabled
		? await db.query.calorieLog.findMany({
				where: and(
					eq(calorieLog.userId, userId),
					gte(calorieLog.recordDate, from),
					lte(calorieLog.recordDate, to),
				),
			})
		: [];

	// 日付ごとの習慣の結果・カロリー合計を先に集計しておく(日ごとにクエリを発行しないため)
	const resultsByDate = new Map<string, Record<string, string>>();
	for (const log of habitLogsInRange) {
		if (!habitIds.has(log.habitId)) {
			continue;
		}
		const existing = resultsByDate.get(log.recordDate) ?? {};
		existing[log.habitId] = log.result;
		resultsByDate.set(log.recordDate, existing);
	}

	const caloriesByDate = new Map<string, number>();
	for (const log of calorieLogsInRange) {
		caloriesByDate.set(log.recordDate, (caloriesByDate.get(log.recordDate) ?? 0) + log.calories);
	}

	const days: { date: string; results: Record<string, string>; calories: number | null }[] = [];
	for (let date = from; date <= to; date = shiftDays(date, 1)) {
		// カロリーは「記録が無い日」と「0kcalを記録した日」を区別する。
		// カロリー記録が無効な利用者は常にnull、有効な場合は
		// その日の記録が1件も無ければnull、1件以上あれば合計(0を含む)を返す
		const calories = calorieTrackingEnabled
			? (caloriesByDate.has(date) ? caloriesByDate.get(date)! : null)
			: null;
		days.push({
			date,
			results: resultsByDate.get(date) ?? {},
			calories,
		});
	}

	const eligibleDays = countEligibleDays({ start: from, end: to }, accountCreatedDate, today);
	const totals: Record<
		string,
		{ completed: number; partial: number; notCompleted: number; eligibleDays: number }
	> = {};
	for (const h of habits) {
		let completed = 0;
		let partial = 0;
		let notCompleted = 0;
		for (const log of habitLogsInRange) {
			if (log.habitId !== h.id) {
				continue;
			}
			if (log.result === "completed") completed++;
			else if (log.result === "partial") partial++;
			else if (log.result === "not_completed") notCompleted++;
		}
		totals[h.id] = { completed, partial, notCompleted, eligibleDays };
	}

	const recordedDays = caloriesByDate.size;
	const caloriesTotal = {
		average:
			calorieTrackingEnabled && recordedDays > 0
				? Array.from(caloriesByDate.values()).reduce((sum, v) => sum + v, 0) / recordedDays
				: null,
		recordedDays: calorieTrackingEnabled ? recordedDays : 0,
	};

	return {
		habits: habits.map((h) => ({
			id: h.id,
			name: h.name,
			kind: h.kind,
			evaluationScale: h.evaluationScale,
		})),
		days,
		totals: { habits: totals, calories: caloriesTotal },
		accountCreatedDate,
	};
}
