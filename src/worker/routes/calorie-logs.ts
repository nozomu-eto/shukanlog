import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { calorieLog, profile } from "../db/schema";
import { CALORIE_MAX, CALORIE_MIN, CALORIE_NOTE_MAX_LENGTH } from "../../shared/limits";

// POST /api/calorie-logs のリクエストボディ
export const createCalorieLogBodySchema = z.object({
	date: z.string(),
	calories: z.number().int().min(CALORIE_MIN).max(CALORIE_MAX),
	note: z.string().max(CALORIE_NOTE_MAX_LENGTH).optional(),
});

// PATCH /api/calorie-logs/:id のリクエストボディ(どちらも省略可能。両方省略はエラーにしない)
export const patchCalorieLogBodySchema = z.object({
	calories: z.number().int().min(CALORIE_MIN).max(CALORIE_MAX).optional(),
	note: z.string().max(CALORIE_NOTE_MAX_LENGTH).optional(),
});

// 利用者がカロリー記録を有効にしているかどうかを確認する(profile行が無ければ既定のtrue扱い)
export async function isCalorieTrackingEnabled(env: Env, userId: string): Promise<boolean> {
	const db = getDb(env);
	const profileRow = await db.query.profile.findFirst({ where: eq(profile.userId, userId) });
	return profileRow?.calorieTrackingEnabled ?? true;
}

// 本人のカロリー記録を1件取得する(他人の記録・存在しない記録はundefinedを返す。存在の有無を区別させないため)
export async function findOwnCalorieLog(env: Env, userId: string, id: string) {
	const db = getDb(env);
	return db.query.calorieLog.findFirst({
		where: and(eq(calorieLog.id, id), eq(calorieLog.userId, userId)),
	});
}
