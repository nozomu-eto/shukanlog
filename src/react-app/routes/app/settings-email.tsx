import { useState, type FormEvent } from "react";
import { useFetcher } from "react-router";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { PasswordField } from "../../components/PasswordField";
import { validateEmail, validatePasswordRequired, validateOtp } from "../../lib/validators";
import { useAppMe } from "./app-loader";
import type { settingsEmailAction } from "./settings-email-action";
import styles from "./settings-email.module.css";

// メールアドレスの変更(/app/settings/email)。
// docs/design/mockups/EmailChange.dc.html・EmailChangePC.dc.html に合わせている。
// 確認コードの送信・検証はroute action(settingsEmailAction)に送る。画面の段階(form→code→done)は、
// actionが返した結果のstepをそのまま使う。
// 確認が済むまでは今のメールアドレスのまま(確認コードの検証(auth.emailOtp.changeEmail)に
// 成功した時点でBetter Auth側がセッションのメールアドレスを更新する)
export function SettingsEmailRoute() {
	const me = useAppMe();
	const fetcher = useFetcher<typeof settingsEmailAction>();

	const [newEmail, setNewEmail] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [code, setCode] = useState("");
	const [tried, setTried] = useState(false);

	const step = fetcher.data?.step ?? "form";
	const submitting = fetcher.state !== "idle";
	const formError = fetcher.data?.error ?? null;

	const newEmailError = tried ? validateEmail(newEmail) : undefined;
	const currentPasswordError = tried ? validatePasswordRequired(currentPassword) : undefined;
	const codeError = tried ? validateOtp(code) : undefined;

	function handleSubmitForm(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		if (validateEmail(newEmail) || validatePasswordRequired(currentPassword)) {
			return;
		}
		fetcher.submit({ intent: "request", newEmail, currentPassword }, { method: "post" });
		setTried(false);
	}

	function handleSubmitCode(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		if (validateOtp(code)) {
			return;
		}
		fetcher.submit({ intent: "verify", newEmail, otp: code }, { method: "post" });
	}

	return (
		<div className={styles.body}>
			<div className={styles.card}>
				{step === "form" ? (
					<form className={styles.stepStack} onSubmit={handleSubmitForm} noValidate>
						<div className={styles.currentEmail}>
							<span className={styles.currentEmailLabel}>現在のメールアドレス</span>
							<span className={styles.currentEmailValue}>{me.user.email}</span>
						</div>
						<TextField
							id="newEmail"
							label="新しいメールアドレス"
							type="email"
							autoComplete="email"
							inputMode="email"
							value={newEmail}
							onChange={(e) => setNewEmail(e.target.value)}
							error={newEmailError}
						/>
						<PasswordField
							id="curPw"
							label="現在のパスワード"
							help="本人確認のために入力してください"
							autoComplete="current-password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							error={currentPasswordError}
						/>
						{formError ? <p role="alert" className={styles.formError}>{formError}</p> : null}
						<Button type="submit" disabled={submitting}>
							確認コードを送る
						</Button>
					</form>
				) : step === "code" ? (
					<form className={styles.stepStack} onSubmit={handleSubmitCode} noValidate>
						<p className={styles.lead}>
							新しいメールアドレスに6桁の確認コードを送りました。確認が済むまでは、今のメールアドレスのままです。
						</p>
						<TextField
							id="code"
							label="確認コード"
							type="text"
							inputMode="numeric"
							autoComplete="one-time-code"
							placeholder="123456"
							maxLength={6}
							value={code}
							onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
							error={codeError}
						/>
						{formError ? <p role="alert" className={styles.formError}>{formError}</p> : null}
						<Button type="submit" disabled={submitting}>
							変更する
						</Button>
					</form>
				) : (
					<div role="status" className={styles.stepStack}>
						<p className={styles.lead}>メールアドレスを変更しました。次回から新しいメールアドレスでログインしてください。</p>
						<Button to="/app/settings">設定に戻る</Button>
					</div>
				)}
			</div>
		</div>
	);
}
