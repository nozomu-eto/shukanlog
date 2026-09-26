import { SELF, env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "../../src/worker/db/client";
import { profile, user } from "../../src/worker/db/schema";
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

function createCalorieLog(cookie: string, body: unknown) {
	return SELF.fetch("https://example.com/api/calorie-logs", {
		method: "POST",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

function patchCalorieLog(cookie: string, id: string, body: unknown) {
	return SELF.fetch(`https://example.com/api/calorie-logs/${id}`, {
		method: "PATCH",
		headers: { cookie, "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

function deleteCalorieLog(cookie: string, id: string) {
	return SELF.fetch(`https://example.com/api/calorie-logs/${id}`, {
		method: "DELETE",
		headers: { cookie },
	});
}

// signUpAndSignInは利用者ごとに別のIPアドレスを使うため、新規登録のレート制限に抵触せず呼び出せる
describe("カロリー記録のAPI", () => {
	it("作成・更新・削除ができ、入力上限の境界値を確認できる", async () => {
		const { cookie } = await signUpAndSignIn("calorie-a");
		await agreeToConsent(cookie);

		// 作成(201)
		const createRes = await createCalorieLog(cookie, {
			date: "2026-09-20",
			calories: 500,
			note: "昼食",
		});
		expect(createRes.status).toBe(201);
		const created = await createRes.json<{ id: string; calories: number; note: string | null }>();
		expect(created.calories).toBe(500);
		expect(created.note).toBe("昼食");

		// 更新
		const patchRes = await patchCalorieLog(cookie, created.id, { calories: 600 });
		expect(patchRes.status).toBe(200);
		const patched = await patchRes.json<{ calories: number; note: string | null }>();
		expect(patched.calories).toBe(600);
		expect(patched.note).toBe("昼食"); // noteを指定しなければ変わらない

		// 削除
		const deleteRes = await deleteCalorieLog(cookie, created.id);
		expect(deleteRes.status).toBe(204);

		// 削除後は404
		const afterDeleteRes = await patchCalorieLog(cookie, created.id, { calories: 100 });
		expect(afterDeleteRes.status).toBe(404);

		// 境界値: 10000は通る、10001は400
		const maxOkRes = await createCalorieLog(cookie, { date: "2026-09-20", calories: 10000 });
		expect(maxOkRes.status).toBe(201);
		const overMaxRes = await createCalorieLog(cookie, { date: "2026-09-20", calories: 10001 });
		expect(overMaxRes.status).toBe(400);
		expect(await overMaxRes.json()).toEqual({
			error: { code: "VALIDATION_ERROR", message: expect.any(String) },
		});

		// 境界値: メモ500文字は通る、501文字は400
		const note500 = "あ".repeat(500);
		const note501 = "あ".repeat(501);
		const noteOkRes = await createCalorieLog(cookie, {
			date: "2026-09-20",
			calories: 100,
			note: note500,
		});
		expect(noteOkRes.status).toBe(201);
		const noteOverRes = await createCalorieLog(cookie, {
			date: "2026-09-20",
			calories: 100,
			note: note501,
		});
		expect(noteOverRes.status).toBe(400);

		// 未来の日付は400
		const futureRes = await createCalorieLog(cookie, { date: "2999-01-01", calories: 100 });
		expect(futureRes.status).toBe(400);
	});

	it("他人の記録は404、カロリー記録を無効にしている利用者は403", async () => {
		const { cookie: cookieA } = await signUpAndSignIn("calorie-b1");
		await agreeToConsent(cookieA);
		const createRes = await createCalorieLog(cookieA, { date: "2026-09-20", calories: 300 });
		const created = await createRes.json<{ id: string }>();

		const { email: emailB, cookie: cookieB } = await signUpAndSignIn("calorie-b2");
		await agreeToConsent(cookieB);

		// 利用者Bが利用者Aの記録を操作しようとすると404
		const patchOtherRes = await patchCalorieLog(cookieB, created.id, { calories: 1 });
		expect(patchOtherRes.status).toBe(404);
		const deleteOtherRes = await deleteCalorieLog(cookieB, created.id);
		expect(deleteOtherRes.status).toBe(404);

		// 利用者Bがカロリー記録を無効にすると、書き込みは403
		const userIdB = await findUserIdByEmail(emailB);
		const db = getDb(env);
		await db.update(profile).set({ calorieTrackingEnabled: false }).where(eq(profile.userId, userIdB));

		const createDisabledRes = await createCalorieLog(cookieB, { date: "2026-09-20", calories: 100 });
		expect(createDisabledRes.status).toBe(403);
		expect(await createDisabledRes.json()).toEqual({
			error: { code: "CALORIE_TRACKING_DISABLED", message: expect.any(String) },
		});
	});
});
