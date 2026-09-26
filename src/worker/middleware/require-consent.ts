import type { MiddlewareHandler } from "hono";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { termsAgreement } from "../db/schema";
import { POLICY_VERSION } from "../../shared/policy";
import type { AppEnv } from "../types";

// 現在の利用規約(POLICY_VERSION)への同意を確認するミドルウェア。requireSessionの後段で使う。
// 同意していなければ403を返す
export const requireConsent: MiddlewareHandler<AppEnv> = async (c, next) => {
	const db = getDb(c.env);
	const userId = c.get("userId");

	const agreement = await db.query.termsAgreement.findFirst({
		where: and(eq(termsAgreement.userId, userId), eq(termsAgreement.policyVersion, POLICY_VERSION)),
	});

	if (!agreement) {
		return c.json({ error: { code: "CONSENT_REQUIRED", message: "利用規約への同意が必要です" } }, 403);
	}

	await next();
};
