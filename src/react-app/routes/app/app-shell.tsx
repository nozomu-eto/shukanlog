import { Outlet, useSearchParams, useLocation, useNavigation, Link } from "react-router";
import { Settings, ChevronLeft } from "lucide-react";
import { PageTitle } from "../../components/PageTitle";
import { useRevalidateOnVisible } from "../../lib/use-revalidate-on-visible";
import { createSettingsReturnState, getSettingsReturnTo } from "./settings-return-context";
import styles from "./app-shell.module.css";

type Tab = "day" | "week" | "month";
const TABS: { tab: Tab; label: string }[] = [
	{ tab: "day", label: "日" },
	{ tab: "week", label: "週" },
	{ tab: "month", label: "月" },
];

// 設定画面とそのサブページは、docs/design/mockups/Settings.dc.html等の通り、
// スマホでは日週月の切り替えの代わりに「戻る」+ページ名の見出しを表示する(PCは常に通常のヘッダー)。
// パスごとの戻り先・見出しをここにまとめる
const SETTINGS_PAGES: Record<string, { title: string; backLabel: string }> = {
	"/app/settings": { title: "設定", backLabel: "記録に戻る" },
	"/app/settings/email": { title: "メールアドレスの変更", backLabel: "戻る" },
	"/app/settings/password": { title: "パスワードの変更", backLabel: "戻る" },
	"/app/settings/withdraw": { title: "退会", backLabel: "戻る" },
};

// /app配下の共通の枠(ヘッダー・日週月の切り替え)。docs/design.md 5章・docs/week-month-tabs.md 1.1。
// 切り替えても現在のdateクエリパラメータを保持したまま/app?tab=...&date=...へ遷移する
export function AppShell() {
	const [searchParams] = useSearchParams();
	const location = useLocation();
	// 別の画面・タブ・日付へ移動してデータを取得している間はtrue。
	// 取得が終わるまで移動前の画面を残し、その間だけ小さな読み込み中の表示を出す
	// 画面に戻ってきたときに、表示中のデータを取り直す
	useRevalidateOnVisible();
	const navigation = useNavigation();
	const isNavigating = navigation.state === "loading";
	const activeTab: Tab = (searchParams.get("tab") as Tab | null) ?? "day";
	const date = searchParams.get("date");
	const settingsPage = SETTINGS_PAGES[location.pathname];
	const settingsReturnTo = getSettingsReturnTo(location.state);
	const settingsReturnParams = new URLSearchParams(settingsReturnTo.split("?")[1] ?? "");
	const tabDate = settingsPage ? settingsReturnParams.get("date") : date;
	const settingsState = { settingsReturnTo };

	function hrefFor(tab: Tab): string {
		const params = new URLSearchParams();
		params.set("tab", tab);
		if (tabDate) {
			params.set("date", tabDate);
		}
		return `/app?${params.toString()}`;
	}

	return (
		<div className={styles.page}>
			{isNavigating ? <div aria-hidden="true" className={styles.loadingBar} /> : null}
			<p role="status" aria-label="画面の読み込み状況" className="visually-hidden">
				{isNavigating ? "読み込み中" : ""}
			</p>
			{settingsPage ? <PageTitle title={settingsPage.title} /> : null}
			<header className={settingsPage ? `${styles.header} ${styles.headerSettings}` : styles.header}>
				{settingsPage ? (
					<Link
						to={location.pathname === "/app/settings" ? settingsReturnTo : "/app/settings"}
						state={settingsState}
						aria-label={settingsPage.backLabel}
						className={styles.backButton}
					>
						<ChevronLeft size={20} aria-hidden="true" />
					</Link>
				) : null}
				<span className={styles.brand}>shukanlog</span>
				{settingsPage ? <h1 className={styles.mobileTitle}>{settingsPage.title}</h1> : null}
				<nav aria-label="表示期間" className={styles.tabs}>
					{TABS.map(({ tab, label }) => (
						<Link
							key={tab}
							to={hrefFor(tab)}
							aria-current={!settingsPage && activeTab === tab ? "page" : undefined}
							className={!settingsPage && activeTab === tab ? `${styles.tab} ${styles.tabActive}` : styles.tab}
						>
							{label}
						</Link>
					))}
				</nav>
				<Link
					to="/app/settings"
					state={createSettingsReturnState(location)}
					aria-label="設定"
					aria-current={settingsPage ? "page" : undefined}
					className={settingsPage ? `${styles.settingsLink} ${styles.settingsLinkActive}` : styles.settingsLink}
				>
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
