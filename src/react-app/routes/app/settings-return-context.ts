import type { Location } from "react-router";

const RETURN_STATE_KEY = "settingsReturnTo";
const TABS = new Set(["day", "week", "month"]);

// 戻り先は記録画面の許可されたクエリだけに限定し、外部URLや別画面への遷移を防ぐ。
export function getSettingsReturnTo(state: unknown): string {
	if (typeof state !== "object" || state === null || !(RETURN_STATE_KEY in state)) {
		return "/app";
	}

	const returnTo = (state as Record<string, unknown>)[RETURN_STATE_KEY];
	if (typeof returnTo !== "string" || !returnTo.startsWith("/app?")) {
		return "/app";
	}

	const [pathname, search = ""] = returnTo.split("?", 2);
	if (pathname !== "/app") {
		return "/app";
	}

	const params = new URLSearchParams(search);
	const tab = params.get("tab");
	if (!tab || !TABS.has(tab)) {
		return "/app";
	}

	const date = params.get("date");
	if (date && !isCalendarDate(date)) {
		return "/app";
	}

	const safeParams = new URLSearchParams({ tab });
	if (date) {
		safeParams.set("date", date);
	}
	return `/app?${safeParams.toString()}`;
}

// 現在の記録画面のタブと日付だけを履歴stateに保存する。
export function createSettingsReturnState(location: Pick<Location, "pathname" | "search">): {
	settingsReturnTo: string;
} {
	if (location.pathname !== "/app") {
		return { settingsReturnTo: "/app" };
	}

	const params = new URLSearchParams(location.search);
	const tab = params.get("tab");
	if (!tab || !TABS.has(tab)) {
		return { settingsReturnTo: "/app" };
	}

	const safeParams = new URLSearchParams({ tab });
	const date = params.get("date");
	if (date && isCalendarDate(date)) {
		safeParams.set("date", date);
	}
	return { settingsReturnTo: `/app?${safeParams.toString()}` };
}

// 存在しない日付を戻り先に含めないよう、書式と実日付の両方を確認する。
function isCalendarDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}
	const date = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
