import { useSearchParams } from "react-router";
import { DayTabRoute } from "./day-tab";
import { WeekTabRoute } from "./week-tab";
import { MonthTabRoute } from "./month-tab";

// 日・週・月タブ(/app?tab=day|week|month&date=YYYY-MM-DD)
export function TabsRoute() {
	const [searchParams] = useSearchParams();
	const tab = searchParams.get("tab");

	if (tab === "week") {
		return <WeekTabRoute />;
	}
	if (tab === "month") {
		return <MonthTabRoute />;
	}
	return <DayTabRoute />;
}
