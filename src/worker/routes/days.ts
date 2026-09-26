import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { calorieLog, habit, habitLog, profile } from "../db/schema";

// GET /api/days/:date のレスポンスを組み立てる。
// habitsはactiveな習慣をsort_order順に、その日の記録(無ければnull)と一緒に返す。
// caloriesは、カロリー記録を無効にしている利用者にはnullを返す
export async function buildDayResponse(env: Env, userId: string, date: string) {
	const db = getDb(env);

	const habitsWithLogs = await db
		.select({
			id: habit.id,
			name: habit.name,
			kind: habit.kind,
			evaluationScale: habit.evaluationScale,
			result: habitLog.result,
		})
		.from(habit)
		.leftJoin(habitLog, and(eq(habitLog.habitId, habit.id), eq(habitLog.recordDate, date)))
		.where(and(eq(habit.userId, userId), eq(habit.status, "active")))
		.orderBy(habit.sortOrder);

	const profileRow = await db.query.profile.findFirst({ where: eq(profile.userId, userId) });
	const calorieTrackingEnabled = profileRow?.calorieTrackingEnabled ?? true;

	let calories: { total: number; items: { id: string; calories: number; note: string | null }[] } | null =
		null;
	if (calorieTrackingEnabled) {
		const items = await db.query.calorieLog.findMany({
			where: and(eq(calorieLog.userId, userId), eq(calorieLog.recordDate, date)),
		});
		calories = {
			total: items.reduce((sum, item) => sum + item.calories, 0),
			items: items.map((item) => ({ id: item.id, calories: item.calories, note: item.note })),
		};
	}

	return {
		date,
		habits: habitsWithLogs.map((h) => ({
			id: h.id,
			name: h.name,
			kind: h.kind,
			evaluationScale: h.evaluationScale,
			result: h.result ?? null,
		})),
		calories,
	};
}
