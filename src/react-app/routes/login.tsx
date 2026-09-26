import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { authClient } from "../lib/auth-client";
import { UnauthHeader } from "../components/UnauthHeader";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { PasswordField } from "../components/PasswordField";
import { validateEmail, validatePasswordRequired } from "../lib/validators";
import { setPendingEmail } from "../lib/pending-email";
import styles from "./auth-form.module.css";

// ログイン画面(/login)。docs/design/mockups/Login.dc.html・LoginPC.dc.html に合わせている。
// メール未確認のアカウントでログインしようとした場合は、確認コードを再送して/verifyへ移動する
export function LoginRoute() {
	const navigate = useNavigate();
	const location = useLocation();
	// ログアウト直後・パスワード変更直後に、ログイン画面の見出しの上に表示するメッセージ(react-routerのstate経由)
	const loggedOutMessage = (location.state as { message?: string } | null)?.message;

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [tried, setTried] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const emailError = tried ? validateEmail(email) : undefined;
	const passwordError = tried ? validatePasswordRequired(password) : undefined;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		setFormError(null);
		if (validateEmail(email) || validatePasswordRequired(password)) {
			return;
		}

		setSubmitting(true);
		try {
			const { error } = await authClient.signIn.email({ email, password });
			if (!error) {
				navigate("/app", { replace: true });
				return;
			}

			if (error.code === "EMAIL_NOT_VERIFIED") {
				// 未確認のメールアドレスの場合、確認コードを再送して確認画面へ移動する
				await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
				setPendingEmail(email);
				navigate("/verify", { state: { email } });
				return;
			}

			if (error.status === 429) {
				setFormError("しばらく時間をおいてから、もう一度お試しください。");
				return;
			}

			// メールアドレス・パスワードの組み合わせが誤っている場合など
			setFormError("メールアドレスまたはパスワードが正しくありません");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className={styles.page}>
			<UnauthHeader backTo="/" />
			<main className={styles.main}>
				<div className={`${styles.stack} ${styles.card}`}>
					{loggedOutMessage ? (
						<div role="status" className={styles.statusBanner}>
							{loggedOutMessage}
						</div>
					) : null}
					<h1 className={styles.heading}>ログイン</h1>
					<form className={styles.stack} onSubmit={handleSubmit} noValidate>
						<TextField
							id="email"
							label="メールアドレス"
							type="email"
							autoComplete="email"
							inputMode="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							error={emailError}
						/>
						<PasswordField
							id="password"
							label="パスワード"
							autoComplete="current-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							error={passwordError}
						/>
						<Link to="/reset" className={styles.linkRow}>
							パスワードをお忘れの方
						</Link>
						{formError ? (
							<p role="alert" className={styles.footNote}>
								{formError}
							</p>
						) : null}
						<Button type="submit" disabled={submitting}>
							ログイン
						</Button>
					</form>
					<p className={styles.footNote}>
						アカウントをお持ちでない方は <Link to="/signup">新規登録</Link>
					</p>
				</div>
			</main>
		</div>
	);
}
