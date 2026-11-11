import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { authClient, getAuthErrorCode } from "../lib/auth-client";
import { UnauthHeader } from "../components/UnauthHeader";
import { PageTitle } from "../components/PageTitle";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { validateOtp } from "../lib/validators";
import { clearPendingEmail, getPendingEmail } from "../lib/pending-email";
import styles from "./auth-form.module.css";

const RESEND_WAIT_SECONDS = 60;

// 確認コードの入力画面(/verify)。docs/design/mockups/Verify.dc.html・VerifyPC.dc.html に合わせている。
// メールアドレスはreact-routerのstate、または直接開いた場合はsessionStorageから受け取る。
// どちらも無ければ/signupへ移動する
export function VerifyRoute() {
	const navigate = useNavigate();
	const location = useLocation();
	const stateEmail = (location.state as { email?: string } | null)?.email;
	const email = stateEmail ?? getPendingEmail();

	const [code, setCode] = useState("");
	const [tried, setTried] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
	const [resending, setResending] = useState(false);
	const [resendError, setResendError] = useState<string | null>(null);
	const [resent, setResent] = useState(false);

	useEffect(() => {
		if (!email) {
			navigate("/signup", { replace: true });
		}
	}, [email, navigate]);

	useEffect(() => {
		if (resendSecondsLeft <= 0) {
			return;
		}
		const timer = setInterval(() => {
			setResendSecondsLeft((s) => Math.max(0, s - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [resendSecondsLeft]);

	if (!email) {
		return null;
	}

	const codeError = tried ? validateOtp(code) : undefined;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		setFormError(null);
		if (validateOtp(code)) {
			return;
		}

		setSubmitting(true);
		try {
			const { error } = await authClient.emailOtp.verifyEmail({ email: email!, otp: code });
			if (!error) {
				clearPendingEmail();
				// autoSignInAfterVerification(src/worker/auth/options.ts)を有効にしているため、
				// 確認と同時にログイン済みの状態になる。そのまま同意画面へ進める
				navigate("/consent", { replace: true });
				return;
			}

			const errorCode = getAuthErrorCode(error);
			if (errorCode === "INVALID_OTP") {
				setFormError("確認コードが正しくありません");
				return;
			}
			if (errorCode === "OTP_EXPIRED") {
				setFormError("確認コードの有効期限が切れています。再送してください");
				return;
			}
			if (error.status === 429) {
				setFormError("しばらく時間をおいてから、もう一度お試しください。");
				return;
			}
			setFormError("確認コードが正しくありません");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleResend() {
		if (resending || resendSecondsLeft > 0) {
			return;
		}
		setResent(false);
		setResendError(null);
		setResending(true);
		try {
			const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email!, type: "email-verification" });
			if (error) {
				if (error.status === 429) {
					setResendSecondsLeft(RESEND_WAIT_SECONDS);
					setResendError("再送できるまで少しお待ちください。時間をおいて、もう一度お試しください。");
					return;
				}
				setResendError("確認コードを送信できませんでした。通信状況を確認して、もう一度お試しください。");
				return;
			}
			setResent(true);
			setResendSecondsLeft(RESEND_WAIT_SECONDS);
		} catch {
			setResendError("通信に失敗しました。通信状況を確認して、もう一度お試しください。");
		} finally {
			setResending(false);
		}
	}

	return (
		<div className={styles.page}>
			<PageTitle title="確認コードの入力" />
			<UnauthHeader backTo="/signup" />
			<main className={styles.main}>
				<div className={`${styles.stack} ${styles.card}`}>
					<h1 className={styles.heading}>メールアドレスの確認</h1>
					<p className={styles.lead}>{email} に6桁の確認コードを送りました。コードの有効期限は10分です。</p>
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
						{formError ? (
							<p role="alert" className={styles.footNote}>
								{formError}
							</p>
						) : null}
						<Button type="submit" disabled={submitting}>
							確認する
						</Button>
					</form>
					<div className={styles.resendBlock}>
						<Button variant="inline" type="button" onClick={handleResend} disabled={resending || resendSecondsLeft > 0}>
							{resending
								? "送信中…"
								: resendSecondsLeft > 0
									? `確認コードを再送する(${resendSecondsLeft}秒後に再送できます)`
									: "確認コードを再送する"}
						</Button>
						{resendError ? (
							<span role="alert" className={styles.resendNote}>
								{resendError}
							</span>
						) : null}
						{resent ? (
							<span role="status" className={styles.resendNote}>
								確認コードを再送しました。有効期限は10分です。次の再送は60秒後からできます。
							</span>
						) : null}
						<span className={styles.resendNote}>
							届かない場合は、
							<br />
							迷惑メールフォルダも確認してください。
						</span>
					</div>
				</div>
			</main>
		</div>
	);
}
