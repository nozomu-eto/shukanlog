import { apiClient } from "./client";

export interface ProfileResponse {
	calorieTrackingEnabled: boolean;
}

// PATCH /api/profile。カロリー記録の有効・無効を切り替える
export function patchProfile(calorieTrackingEnabled: boolean): Promise<ProfileResponse> {
	return apiClient.patch<ProfileResponse>("/api/profile", { calorieTrackingEnabled });
}
