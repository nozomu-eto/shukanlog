import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { habit, habitLog } from "../db/schema";

// PUT /api/habit-logs のリクエストボディ。
// result が null なら記録の取り消し(未記録に戻す)、値があれば作成・更新する
export const habitLogBodySchema = z.object({
	habitId: z.string().min(1),
	date: z.string(),
	result: z.enum(["completed", "partial", "not_completed"]).nullable(),
});

export type PutHabitLogResult =
	| { ok: true; body: { habitId: string; date: string; result: string | null } }
	| { ok: false; status: 400 | 404; code: "VALIDATION_ERROR" | "NOT_FOUND"; message: string };

// PUT /api/habit-logs の本体処理。ルーティング(日付の未来チェック等)はindex.tsで行い、
// ここでは「その習慣が本人のものか」「partialが2段階の習慣に付けられていないか」の確認と、
// 実際の作成・更新・削除を行う
export async function putHabitLog(
	env: Env,
	userId: string,
	input: { habitId: string; date: string; result: "completed" | "partial" | "not_completed" | null },
): Promise<PutHabitLogResult> {
	const db = getDb(env);

	// 他人の習慣・存在しない習慣は、存在の有無を区別させないため同じ404にする
	const targetHabit = await db.query.habit.findFirst({
		where: and(eq(habit.id, input.habitId), eq(habit.userId, userId)),
	});
	if (!targetHabit) {
		return { ok: false, status: 404, code: "NOT_FOUND", message: "習慣が見つかりません" };
	}

	if (input.result === null) {
		await db
			.delete(habitLog)
			.where(and(eq(habitLog.habitId, input.habitId), eq(habitLog.recordDate, input.date)));
		return { ok: true, body: { habitId: input.habitId, date: input.date, result: null } };
	}

	if (input.result === "partial" && targetHabit.evaluationScale !== 3) {
		return {
			ok: false,
			status: 400,
			code: "VALIDATION_ERROR",
			message: "partialは3段階評価の習慣にしか付けられません",
		};
	}

	await db
		.insert(habitLog)
		.values({
			id: crypto.randomUUID(),
			userId,
			habitId: input.habitId,
			recordDate: input.date,
			result: input.result,
		})
		.onConflictDoUpdate({
			target: [habitLog.habitId, habitLog.recordDate],
			set: {
				result: input.result,
				updatedAt: sql`(cast(unixepoch('subsecond') * 1000 as integer))`,
			},
		});

	return { ok: true, body: { habitId: input.habitId, date: input.date, result: input.result } };
}
