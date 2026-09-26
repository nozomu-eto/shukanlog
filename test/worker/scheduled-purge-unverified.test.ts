import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import worker from "../../src/worker/index";
import { getDb } from "../../src/worker/db/client";
import { user } from "../../src/worker/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

async function runScheduled() {
	const ctx = createExecutionContext();
	await worker.scheduled!(createScheduledController(), env, ctx);
	await waitOnExecutionContext(ctx);
}

describe("定期処理(メール未確認のまま30日を過ぎた利用者の削除)", () => {
	it("メール未確認のまま作成から30日を過ぎた利用者が削除され、確認済み・30日以内の利用者は残る", async () => {
		const db = getDb(env);

		const unverifiedOldId = crypto.randomUUID();
		await db.insert(user).values({
			id: unverifiedOldId,
			name: "未確認・古い",
			email: `unverified-old-${crypto.randomUUID()}@example.com`,
			emailVerified: false,
			createdAt: new Date(Date.now() - 31 * DAY_MS),
		});

		const unverifiedRecentId = crypto.randomUUID();
		await db.insert(user).values({
			id: unverifiedRecentId,
			name: "未確認・最近",
			email: `unverified-recent-${crypto.randomUUID()}@example.com`,
			emailVerified: false,
			createdAt: new Date(Date.now() - DAY_MS),
		});

		const verifiedOldId = crypto.randomUUID();
		await db.insert(user).values({
			id: verifiedOldId,
			name: "確認済み・古い",
			email: `verified-old-${crypto.randomUUID()}@example.com`,
			emailVerified: true,
			createdAt: new Date(Date.now() - 31 * DAY_MS),
		});

		await runScheduled();

		expect(await db.query.user.findFirst({ where: eq(user.id, unverifiedOldId) })).toBeUndefined();
		expect(await db.query.user.findFirst({ where: eq(user.id, unverifiedRecentId) })).not.toBeUndefined();
		expect(await db.query.user.findFirst({ where: eq(user.id, verifiedOldId) })).not.toBeUndefined();
	});
});
