import { SELF, createExecutionContext, createScheduledController, env, waitOnExecutionContext } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import worker from "../../src/worker/index";
import { getDb } from "../../src/worker/db/client";
import { accountDeletion, calorieLog, habit, session, user } from "../../src/worker/db/schema";
import { POLICY_VERSION } from "../../src/shared/policy";
import { signUpAndSignIn } from "./support/auth";

const DAY_MS = 24 * 60 * 60 * 1000;

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

export async function runScheduled() {
	const ctx = createExecutionContext();
	await worker.scheduled!(createScheduledController(), env, ctx);
	await waitOnExecutionContext(ctx);
}

describe("定期処理(退会から30日後の完全削除)", () => {
	it("30日を過ぎた退会申請の利用者と、関連するすべての行が削除される(D1の外部キー連動削除を確認する)", async () => {
		const { email, cookie } = await signUpAndSignIn("purge-withdraw-a");
		await agreeToConsent(cookie);
		const userId = await findUserIdByEmail(email);

		const db = getDb(env);
		await db.insert(calorieLog).values({ id: crypto.randomUUID(), userId, recordDate: "2026-09-01", calories: 500 });
		// 30日を過ぎた退会申請を直接作る(実際のAPIはpurgeAfterを未来にするため、テストでは過去の日時を直接挿入する)
		await db.insert(accountDeletion).values({
			id: crypto.randomUUID(),
			userId,
			requestedAt: Date.now() - 31 * DAY_MS,
			purgeAfter: Date.now() - DAY_MS,
		});

		await runScheduled();

		const userRow = await db.query.user.findFirst({ where: eq(user.id, userId) });
		expect(userRow).toBeUndefined();

		const sessionRows = await db.query.session.findMany({ where: eq(session.userId, userId) });
		expect(sessionRows).toHaveLength(0);
		const habitRows = await db.query.habit.findMany({ where: eq(habit.userId, userId) });
		expect(habitRows).toHaveLength(0);
		const calorieRows = await db.query.calorieLog.findMany({ where: eq(calorieLog.userId, userId) });
		expect(calorieRows).toHaveLength(0);
		const deletionRows = await db.query.accountDeletion.findMany({ where: eq(accountDeletion.userId, userId) });
		expect(deletionRows).toHaveLength(0);
	});

	it("30日以内・取り消し済みの退会申請の利用者は削除されない", async () => {
		const { email: emailWithin } = await signUpAndSignIn("purge-withdraw-b");
		const userIdWithin = await findUserIdByEmail(emailWithin);
		const { email: emailCanceled } = await signUpAndSignIn("purge-withdraw-c");
		const userIdCanceled = await findUserIdByEmail(emailCanceled);

		const db = getDb(env);
		// 申請から30日以内(purgeAfterが未来)
		await db.insert(accountDeletion).values({
			id: crypto.randomUUID(),
			userId: userIdWithin,
			requestedAt: Date.now() - DAY_MS,
			purgeAfter: Date.now() + 29 * DAY_MS,
		});
		// 30日を過ぎているが取り消し済み
		await db.insert(accountDeletion).values({
			id: crypto.randomUUID(),
			userId: userIdCanceled,
			requestedAt: Date.now() - 31 * DAY_MS,
			purgeAfter: Date.now() - DAY_MS,
			canceledAt: Date.now() - DAY_MS,
		});

		await runScheduled();

		expect(await db.query.user.findFirst({ where: eq(user.id, userIdWithin) })).not.toBeUndefined();
		expect(await db.query.user.findFirst({ where: eq(user.id, userIdCanceled) })).not.toBeUndefined();
	});
});
