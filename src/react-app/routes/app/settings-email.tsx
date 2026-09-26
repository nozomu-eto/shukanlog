import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../api/me";
import { requestEmailChange } from "../../api/account";
import { authClient, getAuthErrorCode } from "../../lib/auth-client";
import { toDisplayMessage, ApiError } from "../../api/errors";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { PasswordField } from "../../components/PasswordField";
import { validateEmail, validatePasswordRequired, validateOtp } from "../../lib/validators";
import styles from "./settings-email.module.css";

type Step = "form" | "code" | "done";

// メールアドレスの変更(/app/settings/email)。
// docs/design/mockups/EmailChange.dc.html・EmailChangePC.dc.html に合わせている。
// 確認が済むまでは今のメールアドレスのまま(確認コードの検証(auth.emailOtp.changeEmail)に
// 成功した時点でBetter Auth側がセッションのメールアドレスを更新する)
export function SettingsEmailRoute() {
	const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });

	const [step, setStep] = useState<Step>("form");
	const [newEmail, setNewEmail] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [code, setCode] = useState("");
	const [tried, setTried] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const newEmailError = tried ? validateEmail(newEmail) : undefined;
	const currentPasswordError = tried ? validatePasswordRequired(currentPassword) : undefined;
	const codeError = tried ? validateOtp(code) : undefined;

	async function handleSubmitForm(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		setFormError(null);
		if (validateEmail(newEmail) || validatePasswordRequired(currentPassword)) {
			return;
		}

		setSubmitting(true);
		try {
			await requestEmailChange(newEmail, currentPassword);
			setStep("code");
			setTried(false);
		} catch (error) {
			if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
				setFormError(error.message);
			} else {
				setFormError(toDisplayMessage(error));
			}
		} finally {
			setSubmitting(false);
		}
	}

	async function handleSubmitCode(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		setFormError(null);
		if (validateOtp(code)) {
			return;
		}

		setSubmitting(true);
		try {
			const { error } = await authClient.emailOtp.changeEmail({ newEmail, otp: code });
			if (!error) {
				setStep("done");
				return;
			}
			const errorCode = getAuthErrorCode(error);
			if (errorCode === "INVALID_OTP") {
				setFormError("確認コードが正しくありません");
				return;
			}
			if (errorCode === "OTP_EXPIRED") {
				setFormError("確認コードの有効期限が切れています。もう一度手続きをやり直してください");
				return;
			}
			setFormError("確認コードが正しくありません");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className={styles.body}>
			<div className={styles.card}>
				{step === "form" ? (
					<form className={styles.stepStack} onSubmit={handleSubmitForm} noValidate>
						<div className={styles.currentEmail}>
							<span className={styles.currentEmailLabel}>現在のメールアドレス</span>
							<span className={styles.currentEmailValue}>{meQuery.data?.user.email ?? ""}</span>
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
