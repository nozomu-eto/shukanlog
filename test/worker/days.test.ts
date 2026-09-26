import { SELF, env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "../../src/worker/db/client";
import { calorieLog, habit, habitLog, profile, user } from "../../src/worker/db/schema";
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

// signUpAndSignInは利用者ごとに別のIPアドレスを使うため、新規登録のレート制限に抵触せず呼び出せる
describe("GET /api/days/:date", () => {
	it("記録がある日・無い日を、同じ利用者の別々の日付で確認する", async () => {
		const { email, cookie } = await signUpAndSignIn("days-a");
		await agreeToConsent(cookie);
		const userId = await findUserIdByEmail(email);
		const db = getDb(env);

		const habits = await db.query.habit.findMany({ where: eq(habit.userId, userId) });
		const medication = habits.find((h) => h.kind === "medication")!;

		await db.insert(habitLog).values({
			id: crypto.randomUUID(),
			userId,
			habitId: medication.id,
			recordDate: "2026-09-20",
			result: "completed",
		});
		await db.insert(calorieLog).values([
			{ id: crypto.randomUUID(), userId, recordDate: "2026-09-20", calories: 300, note: "朝食" },
			{ id: crypto.randomUUID(), userId, recordDate: "2026-09-20", calories: 500, note: null },
		]);

		const withRecordRes = await SELF.fetch("https://example.com/api/days/2026-09-20", {
			headers: { cookie },
		});
		expect(withRecordRes.status).toBe(200);
		const withRecord = await withRecordRes.json<{
			date: string;
			habits: { id: string; kind: string; result: string | null }[];
			calories: { total: number; items: { calories: number; note: string | null }[] } | null;
		}>();
		expect(withRecord.date).toBe("2026-09-20");
		expect(withRecord.habits).toHaveLength(2);
		expect(withRecord.habits.find((h) => h.kind === "medication")?.result).toBe("completed");
		expect(withRecord.habits.find((h) => h.kind === "exercise")?.result).toBeNull();
		expect(withRecord.calories?.total).toBe(800);
		expect(withRecord.calories?.items).toHaveLength(2);

		const noRecordRes = await SELF.fetch("https://example.com/api/days/2026-09-21", {
			headers: { cookie },
		});
		expect(noRecordRes.status).toBe(200);
		const noRecord = await noRecordRes.json<{
			habits: { result: string | null }[];
			calories: { total: number; items: unknown[] } | null;
		}>();
		expect(noRecord.habits.every((h) => h.result === null)).toBe(true);
		expect(noRecord.calories).toEqual({ total: 0, items: [] });

		// 未来の日付・不正な日付は400(VALIDATION_ERROR)
		const futureRes = await SELF.fetch("https://example.com/api/days/2999-01-01", { headers: { cookie } });
		expect(futureRes.status).toBe(400);
		expect(await futureRes.json()).toEqual({
			error: { code: "VALIDATION_ERROR", message: expect.any(String) },
		});

		const invalidRes = await SELF.fetch("https://example.com/api/days/not-a-date", { headers: { cookie } });
		expect(invalidRes.status).toBe(400);
	});

	it("カロリー記録を無効にしている利用者にはcaloriesがnullで返る", async () => {
		const { email, cookie } = await signUpAndSignIn("days-b");
		await agreeToConsent(cookie);
		const userId = await findUserIdByEmail(email);
		const db = getDb(env);
		await db.update(profile).set({ calorieTrackingEnabled: false }).where(eq(profile.userId, userId));

		const res = await SELF.fetch("https://example.com/api/days/2026-09-22", { headers: { cookie } });
		expect(res.status).toBe(200);
		const body = await res.json<{ calories: unknown }>();
		expect(body.calories).toBeNull();
	});
});
