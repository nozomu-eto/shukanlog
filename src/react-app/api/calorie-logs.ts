import { apiClient } from "./client";

export interface CalorieLogResponse {
	id: string;
	date: string;
	calories: number;
	note: string | null;
}

// POST /api/calorie-logs。カロリー記録を新規作成する
export function postCalorieLog(params: { date: string; calories: number; note?: string }): Promise<CalorieLogResponse> {
	return apiClient.post<CalorieLogResponse>("/api/calorie-logs", params);
}

// PATCH /api/calorie-logs/:id。カロリー記録を更新する(calories・noteはどちらも省略可能)
export function patchCalorieLog(
	id: string,
	params: { calories?: number; note?: string },
): Promise<CalorieLogResponse> {
	return apiClient.patch<CalorieLogResponse>(`/api/calorie-logs/${id}`, params);
}

// DELETE /api/calorie-logs/:id。カロリー記録を削除する
export function deleteCalorieLog(id: string): Promise<void> {
	return apiClient.delete<void>(`/api/calorie-logs/${id}`);
}
