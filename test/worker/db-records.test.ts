import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../../src/worker/db/client";
import { calorieLog, habit, habitLog, profile, termsAgreement, user } from "../../src/worker/db/schema";

// 記録用テーブル(profile/habit/habit_log/calorie_log/terms_agreement)への
// 書き込み・読み出しと、一意制約が実際に働くことを確認する
describe("記録用テーブル", () => {
	// D1のデータはテスト間で永続化される(初期化されない)ため、テストごとに一意なIDを使う
	let userId: string;

	beforeEach(async () => {
		userId = crypto.randomUUID();
		const db = getDb(env);
		// user行が無いと外部キー制約(user_idの参照先)を満たせないため、テスト用のuserを作っておく
		await db.insert(user).values({
			id: userId,
			name: "テストユーザー",
			email: `${userId}@example.com`,
			emailVerified: false,
		});
	});

	it("profileへ書き込み・読み出しができる", async () => {
		const db = getDb(env);
		await db.insert(profile).values({ userId, calorieTrackingEnabled: true });

		const row = await db.query.profile.findFirst({ where: eq(profile.userId, userId) });
		expect(row?.calorieTrackingEnabled).toBe(true);
	});

	it("habitへ書き込み・読み出しができ、(user_id, kind)の一意制約が働く", async () => {
		const db = getDb(env);
		await db.insert(habit).values({
			id: crypto.randomUUID(),
			userId,
			name: "服薬",
			kind: "medication",
			evaluationScale: 2,
			status: "active",
			sortOrder: 0,
		});

		const rows = await db.query.habit.findMany({ where: eq(habit.userId, userId) });
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe("服薬");

		// 同じ利用者が同じ種類の習慣を二重に作ろうとするとエラーになる
		await expect(
			db.insert(habit).values({
				id: crypto.randomUUID(),
				userId,
				name: "服薬(2つ目)",
				kind: "medication",
				evaluationScale: 2,
				status: "active",
				sortOrder: 1,
			}),
		).rejects.toThrow();
	});

	it("habit_logへ書き込み・読み出しができ、(habit_id, record_date)の一意制約が働く", async () => {
		const db = getDb(env);
		const habitId = crypto.randomUUID();
		await db.insert(habit).values({
			id: habitId,
			userId,
			name: "服薬",
			kind: "medication",
			evaluationScale: 2,
			status: "active",
			sortOrder: 0,
		});
		await db.insert(habitLog).values({
			id: crypto.randomUUID(),
			userId,
			habitId,
			recordDate: "2026-09-25",
			result: "completed",
		});

		const rows = await db.query.habitLog.findMany({ where: eq(habitLog.habitId, habitId) });
		expect(rows).toHaveLength(1);
		expect(rows[0].result).toBe("completed");

		await expect(
			db.insert(habitLog).values({
				id: crypto.randomUUID(),
				userId,
				habitId,
				recordDate: "2026-09-25",
				result: "not_completed",
			}),
		).rejects.toThrow();
	});

	it("calorie_logへ書き込み・読み出しができる", async () => {
		const db = getDb(env);
		await db.insert(calorieLog).values({
			id: crypto.randomUUID(),
			userId,
			recordDate: "2026-09-25",
			calories: 500,
			note: "昼食",
		});

		const rows = await db.query.calorieLog.findMany({ where: eq(calorieLog.userId, userId) });
		expect(rows).toHaveLength(1);
		expect(rows[0].calories).toBe(500);
	});

	it("terms_agreementへ書き込み・読み出しができ、(user_id, policy_version)の一意制約が働く", async () => {
		const db = getDb(env);
		await db.insert(termsAgreement).values({
			id: crypto.randomUUID(),
			userId,
			policyVersion: "2026-09-25",
		});

		const rows = await db.query.termsAgreement.findMany({
			where: eq(termsAgreement.userId, userId),
		});
		expect(rows).toHaveLength(1);

		await expect(
			db.insert(termsAgreement).values({
				id: crypto.randomUUID(),
				userId,
				policyVersion: "2026-09-25",
			}),
		).rejects.toThrow();
	});

	it("userを削除すると、関連するprofile・habit・habit_log・calorie_log・terms_agreementも連動して削除される", async () => {
		const db = getDb(env);
		const habitId = crypto.randomUUID();
		await db.insert(profile).values({ userId, calorieTrackingEnabled: true });
		await db.insert(habit).values({
			id: habitId,
			userId,
			name: "服薬",
			kind: "medication",
			evaluationScale: 2,
			status: "active",
			sortOrder: 0,
		});
		await db.insert(habitLog).values({
			id: crypto.randomUUID(),
			userId,
			habitId,
			recordDate: "2026-09-25",
			result: "completed",
		});
		await db.insert(calorieLog).values({
			id: crypto.randomUUID(),
			userId,
			recordDate: "2026-09-25",
			calories: 500,
		});
		await db.insert(termsAgreement).values({
			id: crypto.randomUUID(),
			userId,
			policyVersion: "2026-09-25",
		});

		await db.delete(user).where(eq(user.id, userId));

		expect(await db.query.profile.findFirst({ where: eq(profile.userId, userId) })).toBeUndefined();
		expect(await db.query.habit.findMany({ where: eq(habit.userId, userId) })).toHaveLength(0);
		expect(await db.query.habitLog.findMany({ where: eq(habitLog.userId, userId) })).toHaveLength(0);
		expect(await db.query.calorieLog.findMany({ where: eq(calorieLog.userId, userId) })).toHaveLength(0);
		expect(
			await db.query.termsAgreement.findMany({ where: eq(termsAgreement.userId, userId) }),
		).toHaveLength(0);
	});
});
