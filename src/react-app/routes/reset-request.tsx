import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { authClient } from "../lib/auth-client";
import { UnauthHeader } from "../components/UnauthHeader";
import { PageTitle } from "../components/PageTitle";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { validateEmail } from "../lib/validators";
import { setPendingEmail } from "../lib/pending-email";
import styles from "./auth-form.module.css";

// パスワード再設定(要求)画面(/reset)。docs/design/mockups/ResetRequest.dc.html・ResetRequestPC.dc.html に合わせている。
// 登録されていないメールアドレスでも同じ画面の流れにする(存在有無を画面から推測できないようにするため。
// サーバー側もbetter-auth自身の実装で常に{success:true}を返すことをソースで確認済み)
export function ResetRequestRoute() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [tried, setTried] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const emailError = tried ? validateEmail(email) : undefined;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		if (validateEmail(email)) {
			return;
		}
		setSubmitting(true);
		try {
			await authClient.emailOtp.requestPasswordReset({ email });
			setPendingEmail(email);
			navigate("/reset/new", { state: { email } });
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className={styles.page}>
			<PageTitle title="パスワード再設定" />
			<UnauthHeader backTo="/login" />
			<main className={styles.main}>
				<div className={`${styles.stack} ${styles.card}`}>
					<h1 className={styles.heading}>パスワードの再設定</h1>
					<p className={styles.lead}>
						登録しているメールアドレスを入力してください。再設定用の6桁のコードを送ります。
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
						<Button type="submit" disabled={submitting}>
							コードを送る
						</Button>
					</form>
					<Link to="/login" className={styles.centerLink}>
						ログイン画面に戻る
					</Link>
				</div>
			</main>
		</div>
	);
}
