import { useState } from "react";
import { useNavigate, useFetcher, Link } from "react-router";
import { authClient } from "../lib/auth-client";
import type { consentAction } from "./consent-action";
import { UnauthHeader } from "../components/UnauthHeader";
import { PageTitle } from "../components/PageTitle";
import { Button } from "../components/Button";
import formStyles from "./auth-form.module.css";
import styles from "./consent.module.css";

// 利用規約への同意画面(/consent)。docs/design/mockups/Consent.dc.html・ConsentPC.dc.html に合わせている。
// ログイン・同意状況による振り分け自体はconsentLoader(routes/app/app-loader.ts)が行う
export function ConsentRoute() {
	const navigate = useNavigate();
	// 同意の送信はroute action(consentAction)に任せる。成功すると/appへ移動する
	const fetcher = useFetcher<typeof consentAction>();

	const [agree, setAgree] = useState(false);
	const [tried, setTried] = useState(false);

	const submitting = fetcher.state !== "idle";
	const formError = fetcher.data?.error ?? null;

	const agreeError = tried && !agree ? "続けるには同意が必要です" : undefined;

	function handleSubmit() {
		setTried(true);
		if (!agree) {
			return;
		}
		fetcher.submit({}, { method: "post" });
	}

	async function handleLogout() {
		await authClient.signOut();
		navigate("/login", { state: { message: "ログアウトしました" }, replace: true });
	}

	return (
		<div className={formStyles.page}>
			<PageTitle title="利用規約への同意" />
			<UnauthHeader />
			<main className={formStyles.main}>
				<div className={`${formStyles.stack} ${formStyles.card} ${formStyles.cardWide}`}>
					<h1 className={formStyles.heading}>はじめる前に</h1>
					<p className={formStyles.lead}>
						shukanlogは、服薬・運動・カロリーの記録を保存します。服薬の記録は健康に関する情報のため、内容を確認のうえ同意してください。
					</p>
					<ul className={styles.list}>
						<li>記録はあなたのアカウントでのみ閲覧できます</li>
						<li>退会後30日間はデータを保管し、その後完全に削除します</li>
						<li>本サービスは医療機器ではありません。服薬に関する判断は医師・薬剤師にご相談ください</li>
					</ul>
					<div className={styles.policyLinks}>
						<Link to="/terms" target="_blank" className={styles.policyLink}>
							利用規約を読む
						</Link>
						<Link to="/privacy" target="_blank" className={styles.policyLink}>
							プライバシーポリシーを読む
						</Link>
					</div>
					<div className={styles.checkboxRow}>
						<label className={styles.checkboxLabel}>
							<input
								type="checkbox"
								className={styles.checkbox}
								checked={agree}
								aria-describedby={agreeError ? "agree-error" : undefined}
								onChange={(e) => setAgree(e.target.checked)}
							/>
							利用規約とプライバシーポリシーに同意します
						</label>
						{agreeError ? (
							<p id="agree-error" className={formStyles.footNote} role="alert">
								{agreeError}
							</p>
						) : null}
					</div>
					{formError ? (
						<p role="alert" className={formStyles.footNote}>
							{formError}
						</p>
					) : null}
					<Button type="button" onClick={handleSubmit} disabled={submitting}>
						同意してはじめる
					</Button>
					<Button variant="inline" type="button" onClick={handleLogout} className={formStyles.centerLink}>
						同意せずにログアウトする
					</Button>
				</div>
			</main>
		</div>
	);
}
