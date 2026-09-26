import { SELF, env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "../../src/worker/db/client";
import { calorieLog, user } from "../../src/worker/db/schema";
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

describe("PATCH /api/profile", () => {
	it("カロリー記録の有効・無効を切り替えられ、無効にしても既存の記録は残る", async () => {
		const { email, cookie } = await signUpAndSignIn("profile-a");
		await agreeToConsent(cookie);
		const userId = await findUserIdByEmail(email);
		const db = getDb(env);

		await db.insert(calorieLog).values({
			id: crypto.randomUUID(),
			userId,
			recordDate: "2026-09-20",
			calories: 500,
		});

		const disableRes = await SELF.fetch("https://example.com/api/profile", {
			method: "PATCH",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ calorieTrackingEnabled: false }),
		});
		expect(disableRes.status).toBe(200);
		expect(await disableRes.json()).toEqual({ calorieTrackingEnabled: false });

		// 無効化後もカロリー記録自体は削除されていない
		const logsAfterDisable = await db.query.calorieLog.findMany({
			where: eq(calorieLog.userId, userId),
		});
		expect(logsAfterDisable).toHaveLength(1);

		// /api/days でも calories が null になる(無効化が反映されている)
		const daysRes = await SELF.fetch("https://example.com/api/days/2026-09-20", { headers: { cookie } });
		const daysBody = await daysRes.json<{ calories: unknown }>();
		expect(daysBody.calories).toBeNull();

		// 再度有効にすると、記録が引き続き見える
		const enableRes = await SELF.fetch("https://example.com/api/profile", {
			method: "PATCH",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ calorieTrackingEnabled: true }),
		});
		expect(enableRes.status).toBe(200);
		expect(await enableRes.json()).toEqual({ calorieTrackingEnabled: true });

		const daysAfterEnableRes = await SELF.fetch("https://example.com/api/days/2026-09-20", {
			headers: { cookie },
		});
		const daysAfterEnableBody = await daysAfterEnableRes.json<{
			calories: { total: number } | null;
		}>();
		expect(daysAfterEnableBody.calories?.total).toBe(500);
	});
});
