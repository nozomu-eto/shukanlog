import { and, eq, isNull, lte } from "drizzle-orm";
import { getDb } from "../db/client";
import { accountDeletion, user } from "../db/schema";

// 1回の定期処理で削除する件数の上限(D1への負荷を抑えるため)
const PURGE_BATCH_LIMIT = 100;

// メールアドレスの確認が済まないまま作成から30日を過ぎた利用者のデータ保持期間(ミリ秒)
const UNVERIFIED_USER_RETENTION_DAYS = 30;

export interface PurgeResult {
	purgedWithdrawals: number;
	purgedUnverifiedUsers: number;
}

// 退会から30日後の完全削除(T12)・メールアドレスの確認が済まないまま30日を過ぎた利用者の削除(T13)を
// 行う定期処理。user行を削除すると、user_idを参照する各テーブル(onDelete: cascade)がD1の外部キー
// 制約により連動して削除される(test/worker/scheduled-purge.test.tsで実際に確認している)。
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

	// メールアドレスの確認が済まないまま、作成から30日を過ぎた利用者(以前決めたデータ保持方針)
	const unverifiedCutoff = new Date(now - UNVERIFIED_USER_RETENTION_DAYS * 24 * 60 * 60 * 1000);
	const unverifiedRows = await db.query.user.findMany({
		where: and(eq(user.emailVerified, false), lte(user.createdAt, unverifiedCutoff)),
		limit: PURGE_BATCH_LIMIT,
	});
	for (const row of unverifiedRows) {
		await db.delete(user).where(eq(user.id, row.id));
	}

	const result: PurgeResult = {
		purgedWithdrawals: withdrawalRows.length,
		purgedUnverifiedUsers: unverifiedRows.length,
	};
	console.log(
		`定期処理(退会・未確認ユーザーの削除): 退会${result.purgedWithdrawals}件、メール未確認${result.purgedUnverifiedUsers}件を削除しました`,
	);
	return result;
}
