import type { Location } from "react-router";

const HISTORY_RETURN_KEY = "historyReturnTo";
const TABS = new Set(["week", "month"]);

export type HistoryReturnContext = {
	historyReturnTo: { tab: "week" | "month"; date: string };
};

// 週・月から日へ移動するとき、表示中の期間を履歴stateに保存する。
export function createHistoryReturnState(tab: "week" | "month", date: string): HistoryReturnContext {
	return { historyReturnTo: { tab, date } };
}

// URL遷移のstateは外部からも渡り得るため、許可したタブと実在する日付だけを戻り先に使う。
export function getHistoryReturnContext(state: unknown): HistoryReturnContext["historyReturnTo"] | null {
	if (typeof state !== "object" || state === null || !(HISTORY_RETURN_KEY in state)) {
		return null;
	}

	const value = (state as Record<string, unknown>)[HISTORY_RETURN_KEY];
	if (typeof value !== "object" || value === null) {
		return null;
	}
	const { tab, date } = value as Record<string, unknown>;
	if (typeof tab !== "string" || !TABS.has(tab) || typeof date !== "string" || !isCalendarDate(date)) {
		return null;
	}
	return { tab: tab as "week" | "month", date };
}

// 書式だけでなく実際に存在する日付かも確認し、不正な履歴stateを遷移先にしない。
function isCalendarDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}
	const date = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// location型に依存する画面から戻り先stateだけを取り出す共通入口。
export function getHistoryReturnFromLocation(location: Pick<Location, "state">) {
	return getHistoryReturnContext(location.state);
}
