import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { authClient, getAuthErrorCode } from "../lib/auth-client";
import { UnauthHeader } from "../components/UnauthHeader";
import { PageTitle } from "../components/PageTitle";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { PasswordField } from "../components/PasswordField";
import { validateNewPassword, validateOtp } from "../lib/validators";
import { clearPendingEmail, getPendingEmail } from "../lib/pending-email";
import styles from "./auth-form.module.css";

// 新しいパスワードの設定画面(/reset/new)。docs/design/mockups/ResetNew.dc.html・ResetNewPC.dc.html に合わせている
export function ResetNewRoute() {
	const navigate = useNavigate();
	const location = useLocation();
	const stateEmail = (location.state as { email?: string } | null)?.email;
	const email = stateEmail ?? getPendingEmail();

	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [tried, setTried] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	useEffect(() => {
		if (!email) {
			navigate("/reset", { replace: true });
		}
	}, [email, navigate]);

	if (!email) {
		return null;
	}

	const codeError = tried ? validateOtp(code) : undefined;
	const passwordError = tried ? validateNewPassword(password) : undefined;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		setFormError(null);
		if (validateOtp(code) || validateNewPassword(password)) {
			return;
		}

		setSubmitting(true);
		try {
			const { error } = await authClient.emailOtp.resetPassword({ email: email!, otp: code, password });
			if (!error) {
				clearPendingEmail();
				navigate("/login", { state: { message: "パスワードを変更しました" }, replace: true });
				return;
			}

			const errorCode = getAuthErrorCode(error);
			if (errorCode === "INVALID_OTP") {
				setFormError("確認コードが正しくありません");
				return;
			}
			if (errorCode === "OTP_EXPIRED") {
				setFormError("確認コードの有効期限が切れています。最初からやり直してください");
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
		<div className={styles.page}>
			<PageTitle title="新しいパスワードの設定" />
			<UnauthHeader backTo="/reset" />
			<main className={styles.main}>
				<div className={`${styles.stack} ${styles.card}`}>
					<h1 className={styles.heading}>新しいパスワードの設定</h1>
					<p className={styles.lead}>メールで届いた6桁のコードと、新しいパスワードを入力してください。</p>
					<form className={styles.stack} onSubmit={handleSubmit} noValidate>
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
						<PasswordField
							id="password"
							label="新しいパスワード"
							help="8文字以上"
							autoComplete="new-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							error={passwordError}
						/>
						{formError ? (
							<p role="alert" className={styles.footNote}>
								{formError}
							</p>
						) : null}
						<Button type="submit" disabled={submitting}>
							パスワードを変更する
						</Button>
					</form>
				</div>
			</main>
		</div>
	);
}
