import { SELF, env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "../../src/worker/db/client";
import { habit, profile, termsAgreement, user } from "../../src/worker/db/schema";
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

// GET /api/me、POST /api/consent の挙動を確認する
// (Better Authの新規登録レート制限に抵触しないよう、このファイルでのsignUpAndSignInの呼び出しは最小限にする)
describe("GET /api/me, POST /api/consent", () => {
	it("同意前は profile が null・consent.agreed が false、同意すると初期データが作られ2回目以降も重複しない", async () => {
		const { email, cookie } = await signUpAndSignIn("me-consent");

		const beforeRes = await SELF.fetch("https://example.com/api/me", { headers: { cookie } });
		expect(beforeRes.status).toBe(200);
		const before = await beforeRes.json<{
			user: { email: string };
			profile: unknown;
			consent: { currentVersion: string; agreed: boolean };
		}>();
		expect(before.user.email).toBe(email);
		expect(before.profile).toBeNull();
		expect(before.consent).toEqual({ currentVersion: POLICY_VERSION, agreed: false });

		const consentRes = await SELF.fetch("https://example.com/api/consent", {
			method: "POST",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ policyVersion: POLICY_VERSION }),
		});
		expect(consentRes.status).toBe(200);
		const after = await consentRes.json<{
			profile: { calorieTrackingEnabled: boolean } | null;
			consent: { agreed: boolean };
		}>();
		expect(after.profile).toEqual({ calorieTrackingEnabled: true });
		expect(after.consent.agreed).toBe(true);

		// 2回目も同じ結果になり、重複作成されない
		const consentRes2 = await SELF.fetch("https://example.com/api/consent", {
			method: "POST",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ policyVersion: POLICY_VERSION }),
		});
		expect(consentRes2.status).toBe(200);

		const userId = await findUserIdByEmail(email);
		const db = getDb(env);

		const agreements = await db.query.termsAgreement.findMany({
			where: eq(termsAgreement.userId, userId),
		});
		expect(agreements).toHaveLength(1);

		const profiles = await db.query.profile.findMany({ where: eq(profile.userId, userId) });
		expect(profiles).toHaveLength(1);

		// habitはINITIAL_HABITSの2件のみ(重複していない)
		const habits = await db.query.habit.findMany({ where: eq(habit.userId, userId) });
		expect(habits).toHaveLength(2);
		expect(habits.map((h) => h.kind).sort()).toEqual(["exercise", "medication"]);
	});

	it("古いバージョンでの同意は400(VALIDATION_ERROR)", async () => {
		const { cookie } = await signUpAndSignIn("me-consent-old");
		const res = await SELF.fetch("https://example.com/api/consent", {
			method: "POST",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ policyVersion: "2020-01-01" }),
		});
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error: { code: "VALIDATION_ERROR", message: expect.any(String) },
		});
	});

	it("初期データの一部(プロフィールのみ)が欠けている状態でも、同意の呼び出しで習慣が補完される", async () => {
		const { email, cookie } = await signUpAndSignIn("me-consent-partial");
		const userId = await findUserIdByEmail(email);
		const db = getDb(env);

		// あらかじめprofileだけを作っておき、habit・terms_agreementが無い状態を再現する
		await db.insert(profile).values({ userId, calorieTrackingEnabled: false });

		const res = await SELF.fetch("https://example.com/api/consent", {
			method: "POST",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ policyVersion: POLICY_VERSION }),
		});
		expect(res.status).toBe(200);
		const body = await res.json<{ profile: { calorieTrackingEnabled: boolean } | null }>();
		// 既にあったprofileの値(false)は上書きされない(onConflictDoNothingのため)
		expect(body.profile).toEqual({ calorieTrackingEnabled: false });

		const habits = await db.query.habit.findMany({ where: eq(habit.userId, userId) });
		expect(habits).toHaveLength(2);

		const profiles = await db.query.profile.findMany({ where: eq(profile.userId, userId) });
		expect(profiles).toHaveLength(1);
	});
});
