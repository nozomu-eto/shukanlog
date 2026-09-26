import { getDb } from "./client";
import { habit, profile, termsAgreement } from "./schema";
import { INITIAL_HABITS } from "../../shared/initial-habits";
import { POLICY_VERSION } from "../../shared/policy";

// 利用規約への同意を記録し、まだ無ければ初期データ(プロフィール1件・習慣2件)を作成する。
// 何度呼んでも重複作成しないよう、それぞれの一意制約に対して onConflictDoNothing を使い、
// 1つのD1バッチ(batch)としてまとめて実行する(初期データの一部だけが欠けている状態でも、
// このバッチを呼べば欠けている分だけ補完される)
export async function ensureConsentAndInitialData(env: Env, userId: string): Promise<void> {
	const db = getDb(env);

	await db.batch([
		db
			.insert(termsAgreement)
			.values({ id: crypto.randomUUID(), userId, policyVersion: POLICY_VERSION })
			.onConflictDoNothing(),
		db.insert(profile).values({ userId, calorieTrackingEnabled: true }).onConflictDoNothing(),
		...INITIAL_HABITS.map((initialHabit, index) =>
			db
				.insert(habit)
				.values({
					id: crypto.randomUUID(),
					userId,
					name: initialHabit.name,
					kind: initialHabit.kind,
					evaluationScale: initialHabit.evaluationScale,
					status: initialHabit.status,
					sortOrder: index,
				})
				.onConflictDoNothing(),
		),
	]);
}
