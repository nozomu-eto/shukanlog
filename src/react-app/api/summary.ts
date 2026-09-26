import type { EvaluationScale, HabitKind, HabitLogResult } from "../../shared/types";
import { apiClient } from "./client";

export interface SummaryHabit {
	id: string;
	name: string;
	kind: HabitKind;
	evaluationScale: EvaluationScale;
}

export interface SummaryDay {
	date: string;
	results: Record<string, HabitLogResult>;
	// カロリー記録が無効な利用者、またはその日の記録が無ければnull
	calories: number | null;
}

export interface SummaryTotals {
	habits: Record<string, { completed: number; partial: number; notCompleted: number; eligibleDays: number }>;
	calories: { average: number | null; recordedDays: number };
}

export interface SummaryResponse {
	habits: SummaryHabit[];
	days: SummaryDay[];
	totals: SummaryTotals;
	accountCreatedDate: string;
}

// GET /api/summary?from=...&to=...。週・月タブの集計をまとめて取得する
export function getSummary(from: string, to: string): Promise<SummaryResponse> {
	return apiClient.get<SummaryResponse>(`/api/summary?from=${from}&to=${to}`);
}
