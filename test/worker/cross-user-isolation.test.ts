import { SELF, env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "../../src/worker/db/client";
import { calorieLog, habit, habitLog, user } from "../../src/worker/db/schema";
import { POLICY_VERSION } from "../../src/shared/policy";
import { signUpAndSignIn } from "./support/auth";

async function findUserIdByEmail(userEmail: string): Promise<string> {
	const db = getDb(env);
	const row = await db.query.user.findFirst({ where: eq(user.email, userEmail) });
	if (!row) {
		throw new Error(`ユーザーが見つかりません: ${userEmail}`);
	}
	return row.id;
}

async function agreeToConsent(cookie: string) {
	const res = await SELF.fetch("https://example.com/api/consent", {
		method: "POST",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify({ policyVersion: POLICY_VERSION }),
	});
	if (res.status !== 200) {
		throw new Error(`同意に失敗しました: ${res.status}`);
	}
}

// 2人の利用者(A・B)を作り、Bが利用者Aの記録(習慣の記録・カロリー記録)に対して
// 取得・更新・削除を試み、どれも成功しない(404、または自分のデータしか返らない)ことを確認する。
// 利用者Aと利用者Bの2人分、signUpAndSignInを呼び出す
describe("他人のデータに触れないこと(横断テスト)", () => {
	it("利用者Bは利用者Aの習慣の記録・カロリー記録を取得・更新・削除できない", async () => {
		const { email: emailA, cookie: cookieA } = await signUpAndSignIn("isolation-a");
		await agreeToConsent(cookieA);
		const userIdA = await findUserIdByEmail(emailA);
		const db = getDb(env);

		const habitsA = await db.query.habit.findMany({ where: eq(habit.userId, userIdA) });
		const medicationA = habitsA.find((h) => h.kind === "medication")!;

		// 利用者Aの習慣の記録・カロリー記録を作っておく
		await db.insert(habitLog).values({
			id: crypto.randomUUID(),
			userId: userIdA,
			habitId: medicationA.id,
			recordDate: "2026-09-20",
			result: "completed",
		});
		const calorieLogIdA = crypto.randomUUID();
		await db.insert(calorieLog).values({
			id: calorieLogIdA,
			userId: userIdA,
			recordDate: "2026-09-20",
			calories: 500,
			note: "Aのメモ",
		});

		const { email: emailB, cookie: cookieB } = await signUpAndSignIn("isolation-b");
		await agreeToConsent(cookieB);
		const userIdB = await findUserIdByEmail(emailB);
		const habitsB = await db.query.habit.findMany({ where: eq(habit.userId, userIdB) });

		// 利用者Aと利用者Bの習慣IDは別々に発行される(そもそも他人の習慣を言い当てることはできない)
		expect(habitsB.map((h) => h.id)).not.toEqual(expect.arrayContaining(habitsA.map((h) => h.id)));

		// Bが利用者Aの習慣の記録を更新しようとしても404
		const putHabitLogRes = await SELF.fetch("https://example.com/api/habit-logs", {
			method: "PUT",
			headers: { cookie: cookieB, "content-type": "application/json" },
			body: JSON.stringify({ habitId: medicationA.id, date: "2026-09-20", result: "not_completed" }),
		});
		expect(putHabitLogRes.status).toBe(404);

		// Bが利用者Aの習慣の記録を取り消そうとしても404
		const deleteHabitLogRes = await SELF.fetch("https://example.com/api/habit-logs", {
			method: "PUT",
			headers: { cookie: cookieB, "content-type": "application/json" },
			body: JSON.stringify({ habitId: medicationA.id, date: "2026-09-20", result: null }),
		});
		expect(deleteHabitLogRes.status).toBe(404);

		// Bが利用者Aのカロリー記録を更新しようとしても404
		const patchCalorieLogRes = await SELF.fetch(
			`https://example.com/api/calorie-logs/${calorieLogIdA}`,
			{
				method: "PATCH",
				headers: { cookie: cookieB, "content-type": "application/json" },
				body: JSON.stringify({ calories: 1 }),
			},
		);
		expect(patchCalorieLogRes.status).toBe(404);

		// Bが利用者Aのカロリー記録を削除しようとしても404
		const deleteCalorieLogRes = await SELF.fetch(
			`https://example.com/api/calorie-logs/${calorieLogIdA}`,
			{
				method: "DELETE",
				headers: { cookie: cookieB },
			},
		);
		expect(deleteCalorieLogRes.status).toBe(404);

		// Bが自分の記録として同じ日を取得しても、Aの記録は一切現れない(自分のデータしか返らない)
		const daysBRes = await SELF.fetch("https://example.com/api/days/2026-09-20", {
			headers: { cookie: cookieB },
		});
		const daysB = await daysBRes.json<{
			habits: { result: string | null }[];
			calories: { total: number; items: unknown[] } | null;
		}>();
		expect(daysB.habits.every((h) => h.result === null)).toBe(true);
		expect(daysB.calories).toEqual({ total: 0, items: [] });

		// 上記の一連の操作の後も、利用者Aのデータは変更・削除されていない(すべて元のまま)
		const habitLogA = await db.query.habitLog.findFirst({
			where: eq(habitLog.habitId, medicationA.id),
		});
		expect(habitLogA?.result).toBe("completed");

		const calorieLogA = await db.query.calorieLog.findFirst({
			where: eq(calorieLog.id, calorieLogIdA),
		});
		expect(calorieLogA?.calories).toBe(500);
		expect(calorieLogA?.note).toBe("Aのメモ");
	});
});
