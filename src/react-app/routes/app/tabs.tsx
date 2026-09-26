import { useSearchParams } from "react-router";
import { DayTabRoute } from "./day-tab";
import { WeekTabRoute } from "./week-tab";

// 日・週・月タブ(/app?tab=day|week|month&date=YYYY-MM-DD)。
// 月タブの中身はステップ4で作るまで見出しだけの仮のページにする
export function TabsRoute() {
	const [searchParams] = useSearchParams();
	const tab = searchParams.get("tab");

	if (tab === "week") {
		return <WeekTabRoute />;
	}
	if (tab === "month") {
		return <h1>月タブ</h1>;
	}
	return <DayTabRoute />;
}
