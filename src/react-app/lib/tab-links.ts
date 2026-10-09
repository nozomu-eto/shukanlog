// 日・週・月タブ間のURL(/app?tab=...&date=...)を組み立てる共通関数
export function hrefForTab(tab: "day" | "week" | "month", date: string): string {
	const params = new URLSearchParams({ tab, date });
	return `/app?${params.toString()}`;
}
