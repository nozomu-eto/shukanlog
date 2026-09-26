import type { HabitLogResult } from "../../shared/types";
import { apiClient } from "./client";

export interface PutHabitLogResponse {
	habitId: string;
	date: string;
	result: HabitLogResult | null;
}

// PUT /api/habit-logs。習慣の記録を作成・更新・取り消す(resultがnullなら取り消し)
export function putHabitLog(params: {
	habitId: string;
	date: string;
	result: HabitLogResult | null;
}): Promise<PutHabitLogResponse> {
	return apiClient.put<PutHabitLogResponse>("/api/habit-logs", params);
}
