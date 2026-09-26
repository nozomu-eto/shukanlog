import { env } from "cloudflare:test";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { requireSession } from "../../../src/worker/middleware/require-session";
import { requireConsent } from "../../../src/worker/middleware/require-consent";
import { writeRateLimit } from "../../../src/worker/middleware/write-rate-limit";
import { getDb } from "../../../src/worker/db/client";
import { termsAgreement } from "../../../src/worker/db/schema";
import { POLICY_VERSION } from "../../../src/shared/policy";
import type { AppEnv } from "../../../src/worker/types";
import { signUpAndSignIn } from "../support/auth";

// requireSession・requireConsent・writeRateLimitの3つの共通ミドルウェアを、
// 実際のプロダクションのルーターとは切り離した最小限のHonoアプリで検証する
function createTestApp() {
	const app = new Hono<AppEnv>();
	app.use("*", requireSession);
	app.use("*", writeRateLimit);
	app.get("/protected", (c) => c.json({ userId: c.get("userId") }));
	app.get("/protected-with-consent", requireConsent, (c) => c.json({ ok: true }));
	app.post("/write", (c) => c.json({ ok: true }));
	return app;
}

describe("requireSession", () => {
	it("未ログインは401(UNAUTHORIZED)を返す", async () => {
		const app = createTestApp();
		const res = await app.request("/protected", {}, env);
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: { code: "UNAUTHORIZED", message: expect.any(String) } });
	});

	it("ログイン済みなら通り、userIdがコンテキストに入る", async () => {
		const { cookie } = await signUpAndSignIn("session-ok");
		const app = createTestApp();
		const res = await app.request("/protected", { headers: { cookie } }, env);
		expect(res.status).toBe(200);
		const body = await res.json<{ userId: string }>();
		expect(typeof body.userId).toBe("string");
	});
});

describe("requireConsent", () => {
	// Better Auth側の新規登録レート制限(60秒に3回)に抵触しないよう、
	// このファイルでのsignUpAndSignInの呼び出し回数を抑えるため、未同意→同意済みの2状態を1つのテストで確認する
	it("未同意は403(CONSENT_REQUIRED)、同意済みなら通る", async () => {
		const { cookie } = await signUpAndSignIn("consent");
		const app = createTestApp();

		const beforeRes = await app.request("/protected-with-consent", { headers: { cookie } }, env);
		expect(beforeRes.status).toBe(403);
		expect(await beforeRes.json()).toEqual({
			error: { code: "CONSENT_REQUIRED", message: expect.any(String) },
		});

		// requireSessionを一度通してuserIdを取得し、同意済みのレコードを直接作る
		const probeRes = await app.request("/protected", { headers: { cookie } }, env);
		const { userId } = await probeRes.json<{ userId: string }>();
		const db = getDb(env);
		await db.insert(termsAgreement).values({ id: crypto.randomUUID(), userId, policyVersion: POLICY_VERSION });

		const afterRes = await app.request("/protected-with-consent", { headers: { cookie } }, env);
		expect(afterRes.status).toBe(200);
	});
});

describe("writeRateLimit", () => {
	it("書き込みの回数が上限(60秒に60回)を超えると429(RATE_LIMITED)を返し、読み取り(GET)は対象外", async () => {
		const { cookie } = await signUpAndSignIn("rate-limit");
		const app = createTestApp();

		let lastStatus = 200;
		for (let i = 0; i < 61; i++) {
			const res = await app.request("/write", { method: "POST", headers: { cookie } }, env);
			lastStatus = res.status;
			if (lastStatus === 429) {
				break;
			}
		}
		expect(lastStatus).toBe(429);

		// 書き込みの上限に達していても、読み取り(GET)は引き続き通る
		const readRes = await app.request("/protected", { headers: { cookie } }, env);
		expect(readRes.status).toBe(200);
	});
});
