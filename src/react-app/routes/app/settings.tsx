import { Link, useNavigate } from "react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { authClient } from "../../lib/auth-client";
import { getMe } from "../../api/me";
import { patchProfile } from "../../api/profile";
import { useToast } from "../../components/Toast";
import styles from "./settings.module.css";

// 設定画面。docs/design/mockups/Settings.dc.html・SettingsPC.dc.html に合わせている
export function SettingsRoute() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { showToast } = useToast();

	const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
	const calorieEnabled = meQuery.data?.profile?.calorieTrackingEnabled ?? true;

	// カロリー記録の有効・無効の切り替え。切り替えたら、日・週・月の表示にも反映されるよう
	// ["me"](calorieTrackingEnabledの読み取り元)と["day"]・["summary"](カロリーの表示先)の
	// キャッシュを無効化する
	const toggleCalorieMutation = useMutation({
		mutationFn: (next: boolean) => patchProfile(next),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["me"] });
			queryClient.invalidateQueries({ queryKey: ["day"] });
			queryClient.invalidateQueries({ queryKey: ["summary"] });
			showToast("設定を変更しました");
		},
		onError: () => {
			showToast("設定を変更できませんでした。通信状況を確認して、もう一度お試しください");
		},
	});

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
							<span className={styles.listItemSub}>{meQuery.data?.user.email ?? ""}</span>
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
						disabled={toggleCalorieMutation.isPending}
						onClick={() => toggleCalorieMutation.mutate(!calorieEnabled)}
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
