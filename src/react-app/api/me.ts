import { apiClient } from "./client";

// GET /api/me ・ POST /api/consent のレスポンスの型(docs/api.md参照)
export interface MeResponse {
	user: { email: string };
	accountCreatedDate: string;
	profile: { calorieTrackingEnabled: boolean } | null;
	consent: { currentVersion: string; agreed: boolean };
}

// 自分の情報(メールアドレス・アカウント作成日・プロフィール・同意状況)を取得する
export function getMe(): Promise<MeResponse> {
	return apiClient.get<MeResponse>("/api/me");
}

// 利用規約・プライバシーポリシーへの同意を記録する
export function postConsent(policyVersion: string): Promise<MeResponse> {
	return apiClient.post<MeResponse>("/api/consent", { policyVersion });
}
