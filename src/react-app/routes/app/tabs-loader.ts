import type { LoaderFunctionArgs } from "react-router";
import { getSummary, type SummaryResponse } from "../../api/summary";
import { getDay, type DayResponse } from "../../api/days";
import { toDisplayMessage } from "../../api/errors";
import { todayInTokyo, isValidDateString, isFuture } from "../../../shared/domain/date";
import { getWeekRange, getMonthRange } from "../../../shared/domain/period";

// 取得の結果。成功なら{ data }、失敗なら画面に出す日本語の文言を入れた{ error }。
// loaderで例外を投げるとerrorElementに切り替わり画面全体が置き換わってしまうため、
// 各タブのデータ取得の失敗は例外にせず、値として画面に渡して今のエラー表示(カード+再読み込み)を出す
export type LoadResult<T> = { data: T } | { error: string };

// loaderの戻り値。tabは表示するタブ、dateは日タブで表示する日付
export type TabsLoaderData =
	| { tab: "day"; date: string; result: LoadResult<DayResponse> }
	| { tab: "week" | "month"; result: LoadResult<SummaryResponse> };

// URLのdateクエリパラメータから、実際に表示する期間の基準日を決める(week-month-tabs.md 1.1)。
// 不正な日付・未来の日付は今日にする。loaderと週・月タブの画面で同じ判定を使う
export function resolveTabDate(rawDate: string | null, today: string): string {
	if (!rawDate || !isValidDateString(rawDate) || isFuture(rawDate, today)) {
		return today;
	}
	return rawDate;
}

// /app(index)のloader。URLのtab・dateに応じて取得するデータを切り替える。
// 日タブはその日の記録(GET /api/days/:date)、週・月タブは集計(GET /api/summary)を取得する。
// タブや日付が変わるたびに、React Routerがこのloaderを再実行する
export async function tabsLoader({ request }: LoaderFunctionArgs): Promise<TabsLoaderData> {
	const searchParams = new URL(request.url).searchParams;
	const tab = searchParams.get("tab");
	const date = resolveTabDate(searchParams.get("date"), todayInTokyo());
	if (tab !== "week" && tab !== "month") {
		try {
			return { tab: "day", date, result: { data: await getDay(date) } };
		} catch (error) {
			return { tab: "day", date, result: { error: toDisplayMessage(error) } };
		}
	}

	const period = tab === "week" ? getWeekRange(date) : getMonthRange(date);
	try {
		return { tab, result: { data: await getSummary(period.start, period.end) } };
	} catch (error) {
		return { tab, result: { error: toDisplayMessage(error) } };
	}
}
