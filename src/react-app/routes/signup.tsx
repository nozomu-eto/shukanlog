import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { authClient, getAuthErrorCode, withTurnstileToken } from "../lib/auth-client";
import { UnauthHeader } from "../components/UnauthHeader";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { PasswordField } from "../components/PasswordField";
import { Turnstile } from "../components/Turnstile";
import { PageTitle } from "../components/PageTitle";
import { validateEmail, validateNewPassword } from "../lib/validators";
import { setPendingEmail } from "../lib/pending-email";
import styles from "./auth-form.module.css";

// 新規登録画面(/signup)。docs/design/mockups/Signup.dc.html・SignupPC.dc.html に合わせている。
// Turnstileのトークンを取得し、サーバー側の検証(x-turnstile-tokenヘッダー)に使う
export function SignupRoute() {
	const navigate = useNavigate();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
	const [tried, setTried] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	// 登録済みのメールアドレスのエラー(下にログインへのリンクを表示するため、formErrorとは別に管理する)
	const [existingAccountError, setExistingAccountError] = useState(false);

	const emailError = tried ? validateEmail(email) : undefined;
	const passwordError = tried ? validateNewPassword(password) : undefined;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		setFormError(null);
		setExistingAccountError(false);
		if (validateEmail(email) || validateNewPassword(password)) {
			return;
		}
		if (!turnstileToken) {
			setFormError("Cloudflare Turnstileの確認が完了していません。しばらくしてからもう一度お試しください");
			return;
		}

		setSubmitting(true);
		try {
			const { error } = await authClient.signUp.email(
				{ email, password, name: email },
				withTurnstileToken(turnstileToken),
			);
			if (!error) {
				setPendingEmail(email);
				navigate("/verify", { state: { email } });
				return;
			}

			const code = getAuthErrorCode(error);
			if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
				// 退会の手続き中かどうかは画面から判別できないようにするため、
				// すべての登録済みのメールアドレスに同じ文言を出す
				setExistingAccountError(true);
				return;
			}
			if (code === "TURNSTILE_TOKEN_REQUIRED" || code === "TURNSTILE_VERIFICATION_FAILED") {
				setFormError("Cloudflare Turnstileの確認に失敗しました。もう一度お試しください");
				return;
			}
			if (error.status === 429) {
				setFormError("しばらく時間をおいてから、もう一度お試しください。");
				return;
			}
			setFormError("登録に失敗しました。もう一度お試しください");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className={styles.page}>
			<PageTitle title="新規登録" />
			<UnauthHeader backTo="/" />
			<main className={styles.main}>
				<div className={`${styles.stack} ${styles.card}`}>
					<h1 className={styles.heading}>新規登録</h1>
					<p className={styles.lead}>
						メールアドレスとパスワードを入力してください。登録したメールアドレスに確認コードを送ります。
					</p>
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
							help="8文字以上"
							autoComplete="new-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							error={passwordError}
						/>
						<Turnstile onTokenChange={setTurnstileToken} />
						{existingAccountError ? (
							<p role="alert" className={styles.footNote}>
								このメールアドレスはすでに登録されています。ログインしてください。退会の手続き中の場合は、30日以内にログインすると退会を取り消せます。
								<br />
								<Link to="/login">ログイン</Link>
							</p>
						) : formError ? (
							<p role="alert" className={styles.footNote}>
								{formError}
							</p>
						) : null}
						<Button type="submit" disabled={submitting}>
							確認コードを送る
						</Button>
					</form>
					<p className={styles.footNote}>
						アカウントをお持ちの方は <Link to="/login">ログイン</Link>
					</p>
				</div>
			</main>
		</div>
	);
}
