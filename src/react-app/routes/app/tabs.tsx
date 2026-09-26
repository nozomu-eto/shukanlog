import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../api/me";
import { useToast } from "../../components/Toast";
import { DayTabRoute } from "./day-tab";
import { WeekTabRoute } from "./week-tab";
import { MonthTabRoute } from "./month-tab";

// ブラウザを閉じるまでの間、「退会を取り消しました」のトーストを二重に出さないための目印
const WITHDRAWAL_CANCEL_TOAST_KEY = "withdrawal-cancel-toast-shown";

// 日・週・月タブ(/app?tab=day|week|month&date=YYYY-MM-DD)
export function TabsRoute() {
	const [searchParams] = useSearchParams();
	const tab = searchParams.get("tab");
	const { showToast } = useToast();

	// ログイン時に退会の申請が取り消された場合(GET /api/meのjustCanceledWithdrawal)、
	// /appに来たタイミングで1回だけ「退会を取り消しました」を表示する
	const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
	useEffect(() => {
		if (!meQuery.data?.justCanceledWithdrawal) {
			return;
		}
		if (sessionStorage.getItem(WITHDRAWAL_CANCEL_TOAST_KEY)) {
			return;
		}
		sessionStorage.setItem(WITHDRAWAL_CANCEL_TOAST_KEY, "1");
		showToast("退会を取り消しました");
	}, [meQuery.data?.justCanceledWithdrawal, showToast]);

	if (tab === "week") {
		return <WeekTabRoute />;
	}
	if (tab === "month") {
		return <MonthTabRoute />;
	}
	return <DayTabRoute />;
}
