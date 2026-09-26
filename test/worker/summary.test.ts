import { SELF, env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "../../src/worker/db/client";
import { calorieLog, habit, habitLog, user } from "../../src/worker/db/schema";
import { POLICY_VERSION } from "../../src/shared/policy";
import { todayInTokyo } from "../../src/shared/domain/date";
import { countEligibleDays } from "../../src/shared/domain/period";
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

function getSummary(cookie: string, from: string, to: string) {
	return SELF.fetch(`https://example.com/api/summary?from=${from}&to=${to}`, { headers: { cookie } });
}

// Better Authの新規登録レート制限(60秒に3回)に抵触しないよう、このファイルでのsignUpAndSignInは2回に抑える
describe("GET /api/summary", () => {
	it("週の集計・月の集計・アカウント作成日より前の分母除外・カロリー平均の計算ができる", async () => {
		const { email, cookie } = await signUpAndSignIn("summary-a");
		await agreeToConsent(cookie);
		const userId = await findUserIdByEmail(email);
		const db = getDb(env);

		// アカウント作成日を明示的に2026-09-24に上書きし、それより前の日が分母に入らないことを確認する
		await db.update(user).set({ createdAt: new Date("2026-09-24T00:00:00Z") }).where(eq(user.id, userId));

		const habits = await db.query.habit.findMany({ where: eq(habit.userId, userId) });
		const medication = habits.find((h) => h.kind === "medication")!;

		// 週: 2026-09-21(月)〜2026-09-27(日)。アカウント作成日(9/24)より前は分母に入らない
		await db.insert(habitLog).values([
			{ id: crypto.randomUUID(), userId, habitId: medication.id, recordDate: "2026-09-24", result: "completed" },
			{ id: crypto.randomUUID(), userId, habitId: medication.id, recordDate: "2026-09-25", result: "not_completed" },
		]);
		await db.insert(calorieLog).values([
			{ id: crypto.randomUUID(), userId, recordDate: "2026-09-24", calories: 1000 },
			{ id: crypto.randomUUID(), userId, recordDate: "2026-09-25", calories: 2000 },
			// 9/26は記録なし。平均の計算から除外されるべき
		]);

		const weekRes = await getSummary(cookie, "2026-09-21", "2026-09-27");
		expect(weekRes.status).toBe(200);
		const week = await weekRes.json<{
			habits: { id: string; kind: string }[];
			days: { date: string; results: Record<string, string>; calories: number | null }[];
			totals: {
				habits: Record<string, { completed: number; notCompleted: number; eligibleDays: number }>;
				calories: { average: number | null; recordedDays: number };
			};
			accountCreatedDate: string;
		}>();

		expect(week.accountCreatedDate).toBe("2026-09-24");
		expect(week.days).toHaveLength(7);
		const day24 = week.days.find((d) => d.date === "2026-09-24");
		expect(day24?.results[medication.id]).toBe("completed");
		expect(day24?.calories).toBe(1000);

		// 分母(eligibleDays)は「アカウント作成日以降かつ今日以前」の日数。
		// テスト実行時点の実際の「今日」を使って期待値を独立に計算し、実装と突き合わせる
		const expectedEligibleDays = countEligibleDays(
			{ start: "2026-09-21", end: "2026-09-27" },
			"2026-09-24",
			todayInTokyo(),
		);
		expect(week.totals.habits[medication.id].completed).toBe(1);
		expect(week.totals.habits[medication.id].notCompleted).toBe(1);
		expect(week.totals.habits[medication.id].eligibleDays).toBe(expectedEligibleDays);

		// カロリーの平均は記録がある日(9/24, 9/25)だけで算出: (1000+2000)/2 = 1500
		expect(week.totals.calories.recordedDays).toBe(2);
		expect(week.totals.calories.average).toBe(1500);

		// 月の集計(2026年9月)でも同じ記録が含まれる
		const monthRes = await getSummary(cookie, "2026-09-01", "2026-09-30");
		expect(monthRes.status).toBe(200);
		const month = await monthRes.json<{ days: { date: string }[] }>();
		expect(month.days).toHaveLength(30);

		// 43日を指定すると400
		const tooLongRes = await getSummary(cookie, "2026-01-01", "2026-02-13"); // 44日
		expect(tooLongRes.status).toBe(400);
		expect(await tooLongRes.json()).toEqual({
			error: { code: "VALIDATION_ERROR", message: expect.any(String) },
		});

		// fromがtoより後ろだと400
		const invalidOrderRes = await getSummary(cookie, "2026-09-27", "2026-09-21");
		expect(invalidOrderRes.status).toBe(400);
	});

	it("カロリー記録を無効にしている利用者は、日ごとのcaloriesと平均が常にnullになる", async () => {
		const { email, cookie } = await signUpAndSignIn("summary-b");
		await agreeToConsent(cookie);
		const userId = await findUserIdByEmail(email);
		const db = getDb(env);

		await db.insert(calorieLog).values({
			id: crypto.randomUUID(),
			userId,
			recordDate: "2026-09-24",
			calories: 999,
		});

		await SELF.fetch("https://example.com/api/profile", {
			method: "PATCH",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ calorieTrackingEnabled: false }),
		});

		const res = await getSummary(cookie, "2026-09-21", "2026-09-27");
		expect(res.status).toBe(200);
		const body = await res.json<{
			days: { calories: number | null }[];
			totals: { calories: { average: number | null } };
		}>();
		expect(body.days.every((d) => d.calories === null)).toBe(true);
		expect(body.totals.calories.average).toBeNull();
	});
});
