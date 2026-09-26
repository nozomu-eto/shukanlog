import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client";
import { profile, termsAgreement } from "../db/schema";
import { POLICY_VERSION } from "../../shared/policy";

// GET /api/me、POST /api/consent が返すレスポンスの形。
// 呼び出し側(consent.ts)からも使うため、共通の関数として切り出している
export async function buildMeResponse(
	env: Env,
	userId: string,
	userEmail: string,
	accountCreatedDate: string,
) {
	const db = getDb(env);

	const [profileRow, agreement] = await Promise.all([
		db.query.profile.findFirst({ where: eq(profile.userId, userId) }),
		db.query.termsAgreement.findFirst({
			where: and(eq(termsAgreement.userId, userId), eq(termsAgreement.policyVersion, POLICY_VERSION)),
		}),
	]);

	return {
		user: { email: userEmail },
		accountCreatedDate,
		profile: profileRow ? { calorieTrackingEnabled: profileRow.calorieTrackingEnabled } : null,
		consent: { currentVersion: POLICY_VERSION, agreed: agreement !== undefined },
	};
}
