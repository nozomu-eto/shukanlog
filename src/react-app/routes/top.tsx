import { Navigate, Link } from "react-router";
import { authClient } from "../lib/auth-client";
import { UnauthHeader } from "../components/UnauthHeader";
import { Button } from "../components/Button";
import { StatusIcon, type Status } from "../components/StatusIcon";
import styles from "./top.module.css";

// トップページの「今週のふりかえり」の例。docs/design/mockups/Top.dc.html のサンプルデータをそのまま使う
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
const EXAMPLE_ROWS: { name: string; cells: Status[] }[] = [
	{ name: "服薬", cells: ["completed", "completed", "not_completed", "completed", "completed", null, null] },
	{ name: "運動", cells: ["partial", "completed", "not_completed", "partial", "completed", null, null] },
];

const FEATURES = [
	{ title: "1日1回、記号をえらぶだけ", desc: "服薬は◯×、運動は◯△×で記録します" },
	{ title: "週・月でふりかえる", desc: "カレンダーで、続いている日がひと目で分かります" },
	{ title: "カロリーもいっしょに", desc: "必要なければ設定でオフにできます" },
];

// トップページ(/)。docs/design/mockups/Top.dc.html・TopPC.dc.html に合わせている。
// ログイン済みの状態でこのページを開いた場合は/appへ移動する
export function TopRoute() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return null;
	}
	if (session) {
		return <Navigate to="/app" replace />;
	}

	return (
		<div className={styles.page}>
			<UnauthHeader showLogin />
			<main className={styles.main}>
				<div className={styles.hero}>
					<div className={styles.heroText}>
						<h1 className={styles.heading}>
							カロリーと習慣を
							<br />
							シンプルに記録するアプリです
						</h1>
						<p className={styles.lead}>個人向けの健康習慣記録サービスです。</p>
						<div className={styles.actions}>
							<Button to="/signup">無料ではじめる</Button>
							<Button to="/login" variant="secondary">
								ログイン
							</Button>
						</div>
					</div>

					<div aria-label="週のふりかえり画面の例" className={styles.exampleCard}>
						<div className={styles.exampleHeader}>
							<span className={styles.exampleTitle}>今週のふりかえり</span>
							<span className={styles.exampleNote}>画面の例</span>
						</div>
						<div className={styles.weekGrid}>
							<span />
							{WEEKDAYS.map((w) => (
								<span key={w} className={styles.weekHeaderRow}>
									{w}
								</span>
							))}
						</div>
						{EXAMPLE_ROWS.map((row) => (
							<div className={styles.weekGrid} key={row.name}>
								<span className={styles.habitName}>{row.name}</span>
								{row.cells.map((status, index) => (
									<span className={styles.cell} key={`${row.name}-${index}`}>
										<StatusIcon status={status} size={18} />
									</span>
								))}
							</div>
						))}
					</div>
				</div>

				<section className={styles.features}>
					{FEATURES.map((feature, index) => (
						<div
							key={feature.title}
							className={[styles.feature, index > 0 ? styles.featureWithBorder : ""].join(" ")}
						>
							<span className={styles.featureNumber}>{index + 1}</span>
							<span className={styles.featureBody}>
								<span className={styles.featureTitle}>{feature.title}</span>
								<span className={styles.featureDesc}>{feature.desc}</span>
							</span>
						</div>
					))}
				</section>
			</main>

			<footer className={styles.footer}>
				<nav aria-label="サイト情報" className={styles.footerNav}>
					<Link to="/terms" className={styles.footerLink}>
						利用規約
					</Link>
					<Link to="/privacy" className={styles.footerLink}>
						プライバシーポリシー
					</Link>
					<a href="mailto:info@shukanlog.com" className={styles.footerLink}>
						お問い合わせ
					</a>
				</nav>
				<p className={styles.copyright}>© 2026 shukanlog</p>
			</footer>
		</div>
	);
}
