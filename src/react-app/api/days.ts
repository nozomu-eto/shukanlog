import type { EvaluationScale, HabitKind, HabitLogResult } from "../../shared/types";
import { apiClient } from "./client";

export interface DayHabit {
	id: string;
	name: string;
	kind: HabitKind;
	evaluationScale: EvaluationScale;
	result: HabitLogResult | null;
}

export interface DayCalorieItem {
	id: string;
	calories: number;
	note: string | null;
}

export interface DayResponse {
	date: string;
	habits: DayHabit[];
	// カロリー記録を無効にしている利用者にはnull
	calories: { total: number; items: DayCalorieItem[] } | null;
}

// GET /api/days/:date。指定した日の習慣・カロリーの記録をまとめて取得する
export function getDay(date: string): Promise<DayResponse> {
	return apiClient.get<DayResponse>(`/api/days/${date}`);
}
