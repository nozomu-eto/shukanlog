import { eq, and, desc, isNotNull } from "drizzle-orm";
import { getDb } from "../db/client";
import { accountDeletion, profile, termsAgreement } from "../db/schema";
import { POLICY_VERSION } from "../../shared/policy";

// 退会の取り消しを「1回だけ」画面に表示できるようにするための期間(ミリ秒)。
// この時間以内に取り消された場合だけ、GET /api/me に justCanceledWithdrawal: true を含める
const RECENT_CANCELLATION_WINDOW_MS = 10 * 60 * 1000;

// GET /api/me、POST /api/consent が返すレスポンスの形。
// 呼び出し側(consent.ts)からも使うため、共通の関数として切り出している
export async function buildMeResponse(
	env: Env,
	userId: string,
	userEmail: string,
	accountCreatedDate: string,
) {
	const db = getDb(env);

	const [profileRow, agreement, latestCancellation] = await Promise.all([
		db.query.profile.findFirst({ where: eq(profile.userId, userId) }),
		db.query.termsAgreement.findFirst({
			where: and(eq(termsAgreement.userId, userId), eq(termsAgreement.policyVersion, POLICY_VERSION)),
		}),
		db.query.accountDeletion.findFirst({
			where: and(eq(accountDeletion.userId, userId), isNotNull(accountDeletion.canceledAt)),
			orderBy: desc(accountDeletion.canceledAt),
		}),
	]);

	const justCanceledWithdrawal =
		latestCancellation?.canceledAt !== null &&
		latestCancellation?.canceledAt !== undefined &&
		Date.now() - latestCancellation.canceledAt < RECENT_CANCELLATION_WINDOW_MS;

	return {
		user: { email: userEmail },
		accountCreatedDate,
		profile: profileRow ? { calorieTrackingEnabled: profileRow.calorieTrackingEnabled } : null,
		consent: { currentVersion: POLICY_VERSION, agreed: agreement !== undefined },
		justCanceledWithdrawal,
	};
}
