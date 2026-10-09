import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../lib/auth-client";
import { postConsent } from "../api/me";
import { toDisplayMessage } from "../api/errors";
import { POLICY_VERSION } from "../../shared/policy";
import { UnauthHeader } from "../components/UnauthHeader";
import { PageTitle } from "../components/PageTitle";
import { Button } from "../components/Button";
import formStyles from "./auth-form.module.css";
import styles from "./consent.module.css";

// 利用規約への同意画面(/consent)。docs/design/mockups/Consent.dc.html・ConsentPC.dc.html に合わせている。
// ログイン・同意状況による振り分け自体はConsentGuard(consent-guard.tsx)が行う
export function ConsentRoute() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [agree, setAgree] = useState(false);
	const [tried, setTried] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const agreeError = tried && !agree ? "続けるには同意が必要です" : undefined;

	async function handleSubmit() {
		setTried(true);
		setFormError(null);
		if (!agree) {
			return;
		}
		setSubmitting(true);
		try {
			await postConsent(POLICY_VERSION);
			// GET /api/meのキャッシュ(consent.agreed)を更新してから/appへ移動する
			await queryClient.invalidateQueries({ queryKey: ["me"] });
			navigate("/app", { replace: true });
		} catch (error) {
			setFormError(toDisplayMessage(error));
		} finally {
			setSubmitting(false);
		}
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
