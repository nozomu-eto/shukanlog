import type { HabitLogResult } from "../types";

export interface HabitStatusCounts {
	completed: number;
	partial: number;
	notCompleted: number;
	unrecorded: number;
}

// 対象日だけの記録状態を数え、空欄を未記録として集計表示に使う
export function countHabitStatuses(
	days: Array<{ date: string; results: Record<string, HabitLogResult> }>,
	habitId: string,
	accountCreatedDate: string,
	today: string,
	eligibleDays: number,
): HabitStatusCounts {
	const counts: HabitStatusCounts = { completed: 0, partial: 0, notCompleted: 0, unrecorded: 0 };
	for (const day of days) {
		if (day.date < accountCreatedDate || day.date > today) continue;
		const status = day.results[habitId];
		if (status === "completed") counts.completed++;
		else if (status === "partial") counts.partial++;
		else if (status === "not_completed") counts.notCompleted++;
	}
	// APIが返す対象日数を使い、対象日内の記録済み状態数との差を未記録として示す
	counts.unrecorded = Math.max(0, eligibleDays - counts.completed - counts.partial - counts.notCompleted);
	return counts;
}
