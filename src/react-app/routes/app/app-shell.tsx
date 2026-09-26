import { Outlet, useSearchParams, Link } from "react-router";
import { Settings } from "lucide-react";
import styles from "./app-shell.module.css";

type Tab = "day" | "week" | "month";
const TABS: { tab: Tab; label: string }[] = [
	{ tab: "day", label: "日" },
	{ tab: "week", label: "週" },
	{ tab: "month", label: "月" },
];

// /app配下の共通の枠(ヘッダー・日週月の切り替え)。docs/design.md 5章・docs/week-month-tabs.md 1.1。
// 切り替えても現在のdateクエリパラメータを保持したまま/app?tab=...&date=...へ遷移する
export function AppShell() {
	const [searchParams] = useSearchParams();
	const activeTab: Tab = (searchParams.get("tab") as Tab | null) ?? "day";
	const date = searchParams.get("date");

	function hrefFor(tab: Tab): string {
		const params = new URLSearchParams();
		params.set("tab", tab);
		if (date) {
			params.set("date", date);
		}
		return `/app?${params.toString()}`;
	}

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<span className={styles.brand}>shukanlog</span>
				<nav aria-label="表示期間" className={styles.tabs}>
					{TABS.map(({ tab, label }) => (
						<Link
							key={tab}
							to={hrefFor(tab)}
							aria-current={activeTab === tab ? "page" : undefined}
							className={activeTab === tab ? `${styles.tab} ${styles.tabActive}` : styles.tab}
						>
							{label}
						</Link>
					))}
				</nav>
				<Link to="/app/settings" aria-label="設定" className={styles.settingsLink}>
					<Settings size={20} strokeWidth={2} aria-hidden="true" />
					<span className={styles.settingsText}>設定</span>
				</Link>
			</header>
			<main className={styles.main}>
				<Outlet />
			</main>
		</div>
	);
}
