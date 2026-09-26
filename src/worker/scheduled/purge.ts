import { and, eq, isNull, lte } from "drizzle-orm";
import { getDb } from "../db/client";
import { accountDeletion, user } from "../db/schema";

// 1回の定期処理で削除する件数の上限(D1への負荷を抑えるため)
const PURGE_BATCH_LIMIT = 100;

export interface PurgeResult {
	purgedWithdrawals: number;
}

// 退会から30日後の完全削除を行う定期処理(T12)。
// user行を削除すると、user_idを参照する各テーブル(onDelete: cascade)がD1の外部キー制約により
// 連動して削除される(test/worker/scheduled-purge.test.tsで実際に確認している)。
// 個人情報(メールアドレス等)はログに出さず、削除件数のみを返す・ログに出す
export async function runScheduledPurge(env: Env): Promise<PurgeResult> {
	const db = getDb(env);
	const now = Date.now();

	// 退会が取り消されておらず、申請から30日(purgeAfter)を過ぎた利用者
	const withdrawalRows = await db.query.accountDeletion.findMany({
		where: and(isNull(accountDeletion.canceledAt), lte(accountDeletion.purgeAfter, now)),
		limit: PURGE_BATCH_LIMIT,
	});
	for (const row of withdrawalRows) {
		await db.delete(user).where(eq(user.id, row.userId));
	}

	const result: PurgeResult = { purgedWithdrawals: withdrawalRows.length };
	console.log(`定期処理(退会から30日後の完全削除): ${result.purgedWithdrawals}件を削除しました`);
	return result;
}
