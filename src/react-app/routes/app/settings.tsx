import { useEffect } from "react";
import { Link, useNavigate, useFetcher } from "react-router";
import { ChevronRight } from "lucide-react";
import { authClient } from "../../lib/auth-client";
import { useToast } from "../../components/Toast";
import { useAppMe } from "./app-loader";
import type { settingsAction } from "./settings-action";
import styles from "./settings.module.css";

// 設定画面。docs/design/mockups/Settings.dc.html・SettingsPC.dc.html に合わせている
export function SettingsRoute() {
	const navigate = useNavigate();
	const { showToast } = useToast();
	const me = useAppMe();
	// カロリー記録の切り替えはroute action(settingsAction)に送る。成功すると
	// React Routerが自動でloaderを取り直すので、/api/meと日・週・月の表示が最新になる
	const fetcher = useFetcher<typeof settingsAction>();

	// 送信中は、送った値(fetcher.formData)を先に表示する。失敗するとformDataが消えて、
	// loaderの値(サーバーの状態)の表示に戻る
	const sendingValue = fetcher.formData?.get("calorieTrackingEnabled");
	const calorieEnabled = sendingValue ? sendingValue === "true" : (me.profile?.calorieTrackingEnabled ?? true);

	// actionの結果が返ってきたら、結果をトーストで知らせる
	useEffect(() => {
		if (!fetcher.data) {
			return;
		}
		showToast(
			fetcher.data.ok
				? "設定を変更しました"
				: "設定を変更できませんでした。通信状況を確認して、もう一度お試しください",
		);
	}, [fetcher.data, showToast]);

	async function handleLogout() {
		await authClient.signOut();
		navigate("/login", { state: { message: "ログアウトしました" }, replace: true });
	}

	return (
		<div className={styles.body}>
			<h1 className={styles.pageTitle}>設定</h1>

			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>アカウント</h2>
				<div className={styles.list}>
					<Link to="/app/settings/email" className={`${styles.listItem} ${styles.listItemTall}`}>
						<span className={styles.listItemLabel}>
							<span>メールアドレス</span>
							<span className={styles.listItemSub}>{me.user.email}</span>
						</span>
						<ChevronRight size={18} aria-hidden="true" className={styles.listItemArrow} />
					</Link>
					<Link to="/app/settings/password" className={styles.listItem}>
						パスワードを変更
						<ChevronRight size={18} aria-hidden="true" className={styles.listItemArrow} />
					</Link>
					<button type="button" className={styles.listItem} onClick={handleLogout}>
						ログアウト
					</button>
				</div>
			</section>

			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>記録</h2>
				<div className={styles.switchRow}>
					<span className={styles.listItemLabel}>
						<span id="calorie-label">カロリーを記録する</span>
						<span className={styles.listItemSub}>オフにすると、日・週・月の画面からカロリーの項目が消えます</span>
					</span>
					<button
						type="button"
						role="switch"
						aria-checked={calorieEnabled}
						aria-labelledby="calorie-label"
						className={styles.switch}
						disabled={fetcher.state !== "idle"}
						onClick={() => fetcher.submit({ calorieTrackingEnabled: String(!calorieEnabled) }, { method: "post" })}
					>
						<span className={calorieEnabled ? `${styles.switchTrack} ${styles.switchTrackOn}` : styles.switchTrack}>
							<span className={styles.switchKnob} />
						</span>
					</button>
				</div>
			</section>

			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>サポート</h2>
				<div className={styles.list}>
					<Link to="/terms" target="_blank" className={styles.listItem}>
						利用規約
						<ChevronRight size={18} aria-hidden="true" className={styles.listItemArrow} />
					</Link>
					<Link to="/privacy" target="_blank" className={styles.listItem}>
						プライバシーポリシー
						<ChevronRight size={18} aria-hidden="true" className={styles.listItemArrow} />
					</Link>
					<Link to="/licenses" target="_blank" className={styles.listItem}>
						ライセンス
						<ChevronRight size={18} aria-hidden="true" className={styles.listItemArrow} />
					</Link>
					<a href="mailto:info@shukanlog.com" className={`${styles.listItem} ${styles.listItemTall}`}>
						<span className={styles.listItemLabel}>
							<span>お問い合わせ</span>
							<span className={styles.listItemSub}>info@shukanlog.com</span>
						</span>
						<ChevronRight size={18} aria-hidden="true" className={styles.listItemArrow} />
					</a>
				</div>
			</section>

			<section className={styles.withdrawSection}>
				<Link to="/app/settings/withdraw" className={styles.withdrawButton}>
					退会する
				</Link>
				<p className={styles.withdrawNote}>退会後30日間はデータを保管し、その後完全に削除します。</p>
			</section>
		</div>
	);
}
