import { SELF, env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "../../src/worker/db/client";
import { accountDeletion, user } from "../../src/worker/db/schema";
import { POLICY_VERSION } from "../../src/shared/policy";
import { signUpAndSignIn } from "./support/auth";

const PASSWORD = "password123";

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

describe("退会", () => {
	it("退会するとセッションが無効になるが、データは残る", async () => {
		const { email, cookie } = await signUpAndSignIn("withdraw-a");
		await agreeToConsent(cookie);
		const userId = await findUserIdByEmail(email);

		const withdrawRes = await SELF.fetch("https://example.com/api/account/withdraw", {
			method: "POST",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ currentPassword: PASSWORD }),
		});
		expect(withdrawRes.status).toBe(200);

		// このセッションは既に無効(ログアウトされている)
		const meRes = await SELF.fetch("https://example.com/api/me", { headers: { cookie } });
		expect(meRes.status).toBe(401);

		// 利用者の行自体はまだ残っている(即時の物理削除はしない)
		const db = getDb(env);
		const userRow = await db.query.user.findFirst({ where: eq(user.id, userId) });
		expect(userRow).not.toBeUndefined();

		const deletionRow = await db.query.accountDeletion.findFirst({ where: eq(accountDeletion.userId, userId) });
		expect(deletionRow?.canceledAt).toBeNull();
		expect(deletionRow?.purgeAfter).toBeGreaterThan(Date.now());
	});

	it("誤ったパスワードでは退会できない", async () => {
		const { cookie } = await signUpAndSignIn("withdraw-b");
		await agreeToConsent(cookie);

		const res = await SELF.fetch("https://example.com/api/account/withdraw", {
			method: "POST",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ currentPassword: "wrong-password" }),
		});
		expect(res.status).toBe(400);
		expect((await res.json<{ error: { code: string } }>()).error.code).toBe("INVALID_PASSWORD");

		// セッションはまだ有効
		const meRes = await SELF.fetch("https://example.com/api/me", { headers: { cookie } });
		expect(meRes.status).toBe(200);
	});

	it("30日以内に同じメールアドレス・パスワードでログインすると取り消され、GET /api/meで分かる", async () => {
		const { email, cookie } = await signUpAndSignIn("withdraw-c");
		await agreeToConsent(cookie);
		const userId = await findUserIdByEmail(email);

		const withdrawRes = await SELF.fetch("https://example.com/api/account/withdraw", {
			method: "POST",
			headers: { cookie, "content-type": "application/json" },
			body: JSON.stringify({ currentPassword: PASSWORD }),
		});
		expect(withdrawRes.status).toBe(200);

		const signInRes = await SELF.fetch("https://example.com/api/auth/sign-in/email", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password: PASSWORD }),
		});
		expect(signInRes.status).toBe(200);
		const newCookie = signInRes.headers.get("set-cookie")!.split(";")[0];

		const db = getDb(env);
		const deletionRow = await db.query.accountDeletion.findFirst({ where: eq(accountDeletion.userId, userId) });
		expect(deletionRow?.canceledAt).not.toBeNull();

		const meRes = await SELF.fetch("https://example.com/api/me", { headers: { cookie: newCookie } });
		expect(meRes.status).toBe(200);
		const meBody = await meRes.json<{ justCanceledWithdrawal: boolean }>();
		expect(meBody.justCanceledWithdrawal).toBe(true);
	});
});
