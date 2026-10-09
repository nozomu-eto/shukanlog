import { useState, type FormEvent } from "react";
import { authClient, getAuthErrorCode } from "../../lib/auth-client";
import { Button } from "../../components/Button";
import { PasswordField } from "../../components/PasswordField";
import { validatePasswordRequired, validateNewPassword } from "../../lib/validators";
import styles from "./settings-password.module.css";

// パスワードの変更(/app/settings/password)。
// docs/design/mockups/PasswordChange.dc.html・PasswordChangePC.dc.htmlに合わせている。
// Better Authのchange-password(revokeOtherSessions: true)を使い、ほかの端末のセッションを
// 無効にする(design.md 9章)。今の端末は、変更後にBetter Auth側で発行される新しいセッションの
// Cookieがそのまま反映されるため、ログインしたままになる
export function SettingsPasswordRoute() {
	const [done, setDone] = useState(false);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [tried, setTried] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const currentPasswordError = tried ? validatePasswordRequired(currentPassword) : undefined;
	const newPasswordError = tried ? validateNewPassword(newPassword) : undefined;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		setFormError(null);
		if (validatePasswordRequired(currentPassword) || validateNewPassword(newPassword)) {
			return;
		}

		setSubmitting(true);
		try {
			const { error } = await authClient.changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: true,
			});
			if (!error) {
				setDone(true);
				return;
			}
			const errorCode = getAuthErrorCode(error);
			if (errorCode === "INVALID_PASSWORD") {
				setFormError("現在のパスワードが正しくありません");
				return;
			}
			if (error.status === 429) {
				setFormError("しばらく時間をおいてから、もう一度お試しください。");
				return;
			}
			setFormError("パスワードを変更できませんでした。もう一度お試しください");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className={styles.body}>
			<div className={styles.card}>
				{done ? (
					<div role="status" className={styles.stepStack}>
						<p className={styles.lead}>パスワードを変更しました。</p>
						<Button to="/app/settings">設定に戻る</Button>
					</div>
				) : (
					<form className={styles.stepStack} onSubmit={handleSubmit} noValidate>
						<PasswordField
							id="curPw"
							label="現在のパスワード"
							autoComplete="current-password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							error={currentPasswordError}
						/>
						<PasswordField
							id="newPw"
							label="新しいパスワード"
							help="8文字以上"
							autoComplete="new-password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							error={newPasswordError}
						/>
						<p className={styles.note}>変更すると、ほかの端末ではログアウトされます。</p>
						{formError ? <p role="alert" className={styles.formError}>{formError}</p> : null}
						<Button type="submit" disabled={submitting}>
							パスワードを変更する
						</Button>
					</form>
				)}
			</div>
		</div>
	);
}
