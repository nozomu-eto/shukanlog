import { useSearchParams } from "react-router";

// 日・週・月タブ(/app?tab=day|week|month&date=YYYY-MM-DD)。
// 日タブの中身はT13で実装する。週・月タブの中身はステップ4で作るまで見出しだけの仮のページにする
export function TabsRoute() {
	const [searchParams] = useSearchParams();
	const tab = searchParams.get("tab");

	if (tab === "week") {
		return <h1>週タブ</h1>;
	}
	if (tab === "month") {
		return <h1>月タブ</h1>;
	}
	return <h1>日タブ</h1>;
}
