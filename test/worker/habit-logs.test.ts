import { SELF, env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "../../src/worker/db/client";
import { habit, user } from "../../src/worker/db/schema";
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

function putHabitLog(cookie: string, body: unknown) {
	return SELF.fetch("https://example.com/api/habit-logs", {
		method: "PUT",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

// signUpAndSignInは利用者ごとに別のIPアドレスを使うため、新規登録のレート制限に抵触せず呼び出せる
describe("PUT /api/habit-logs", () => {
	it("作成・更新・取り消しができ、2段階の習慣にpartialを付けると400になる", async () => {
		const { email, cookie } = await signUpAndSignIn("habit-logs-a");
		await agreeToConsent(cookie);
		const userId = await findUserIdByEmail(email);
		const db = getDb(env);
		const habits = await db.query.habit.findMany({ where: eq(habit.userId, userId) });
		const medication = habits.find((h) => h.kind === "medication")!; // 2段階
		const exercise = habits.find((h) => h.kind === "exercise")!; // 3段階

		// 作成
		const createRes = await putHabitLog(cookie, {
			habitId: exercise.id,
			date: "2026-09-20",
			result: "partial",
		});
		expect(createRes.status).toBe(200);
		expect(await createRes.json()).toEqual({
			habitId: exercise.id,
			date: "2026-09-20",
			result: "partial",
		});

		// 更新(同じ日・同じ習慣は1件のまま上書きされる)
		const updateRes = await putHabitLog(cookie, {
			habitId: exercise.id,
			date: "2026-09-20",
			result: "completed",
		});
		expect(updateRes.status).toBe(200);
		expect(await updateRes.json()).toEqual({
			habitId: exercise.id,
			date: "2026-09-20",
			result: "completed",
		});

		// 取り消し(未記録に戻す)
		const deleteRes = await putHabitLog(cookie, {
			habitId: exercise.id,
			date: "2026-09-20",
			result: null,
		});
		expect(deleteRes.status).toBe(200);
		expect(await deleteRes.json()).toEqual({ habitId: exercise.id, date: "2026-09-20", result: null });

		// 2段階(medication)の習慣にpartialは付けられない
		const invalidRes = await putHabitLog(cookie, {
			habitId: medication.id,
			date: "2026-09-20",
			result: "partial",
		});
		expect(invalidRes.status).toBe(400);
		expect(await invalidRes.json()).toEqual({
			error: { code: "VALIDATION_ERROR", message: expect.any(String) },
		});

		// 未来の日付は400
		const futureRes = await putHabitLog(cookie, {
			habitId: medication.id,
			date: "2999-01-01",
			result: "completed",
		});
		expect(futureRes.status).toBe(400);
	});

	it("他人の習慣・存在しない習慣は404(NOT_FOUND)", async () => {
		const { email: emailA, cookie: cookieA } = await signUpAndSignIn("habit-logs-b1");
		await agreeToConsent(cookieA);
		const userIdA = await findUserIdByEmail(emailA);
		const db = getDb(env);
		const habitsA = await db.query.habit.findMany({ where: eq(habit.userId, userIdA) });
		const habitOfA = habitsA[0];

		const { cookie: cookieB } = await signUpAndSignIn("habit-logs-b2");
		await agreeToConsent(cookieB);

		// 利用者Bが利用者Aの習慣を記録しようとしても404(存在しないものと区別できない)
		const otherUsersHabitRes = await putHabitLog(cookieB, {
			habitId: habitOfA.id,
			date: "2026-09-20",
			result: "completed",
		});
		expect(otherUsersHabitRes.status).toBe(404);
		expect(await otherUsersHabitRes.json()).toEqual({
			error: { code: "NOT_FOUND", message: expect.any(String) },
		});

		// 存在しないhabitIdも同じ404
		const notFoundRes = await putHabitLog(cookieA, {
			habitId: "does-not-exist",
			date: "2026-09-20",
			result: "completed",
		});
		expect(notFoundRes.status).toBe(404);
	});
});
