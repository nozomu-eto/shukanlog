import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { withdraw } from "../../api/account";
import { authClient } from "../../lib/auth-client";
import { toDisplayMessage } from "../../api/errors";
import { Button } from "../../components/Button";
import { PasswordField } from "../../components/PasswordField";
import { validatePasswordRequired } from "../../lib/validators";
import styles from "./settings-withdraw.module.css";

// 退会(/app/settings/withdraw)。docs/design/mockups/Withdraw.dc.html・WithdrawPC.dc.html に合わせている。
// 退会する自体が取り消せない操作の最終確認を兼ねるため(説明・パスワード入力を経ている)、
// 「退会する」ボタンに別途の確認ダイアログは重ねない
export function SettingsWithdrawRoute() {
	const navigate = useNavigate();
	const [currentPassword, setCurrentPassword] = useState("");
	const [tried, setTried] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const currentPasswordError = tried ? validatePasswordRequired(currentPassword) : undefined;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setTried(true);
		setFormError(null);
		if (validatePasswordRequired(currentPassword)) {
			return;
		}

		setSubmitting(true);
		try {
			await withdraw(currentPassword);
			// サーバー側では既にすべてのセッションを無効にしているが、クライアント側に残っている
			// セッションのキャッシュもここで消す(トップページに戻ったときに/appへ戻されないようにする)
			await authClient.signOut();
			navigate("/", {
				state: { message: "退会の手続きが完了しました。ご利用ありがとうございました。" },
				replace: true,
			});
			return;
		} catch (error) {
			setFormError(toDisplayMessage(error));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className={styles.body}>
			<div className={styles.card}>
				<form className={styles.stepStack} onSubmit={handleSubmit} noValidate>
					<p className={styles.lead}>退会すると、すぐにログインできなくなります。</p>
					<ul className={styles.list}>
						<li>記録は30日間保管した後、完全に削除します</li>
						<li>30日以内に同じメールアドレスでログインすると、退会を取り消せます</li>
						<li>30日を過ぎると、記録を元に戻すことはできません</li>
					</ul>
					<PasswordField
						id="curPw"
						label="パスワード"
						help="本人確認のために入力してください"
						autoComplete="current-password"
						value={currentPassword}
						onChange={(e) => setCurrentPassword(e.target.value)}
						error={currentPasswordError}
					/>
					{formError ? <p role="alert" className={styles.formError}>{formError}</p> : null}
					<Button type="submit" variant="danger" disabled={submitting}>
						退会する
					</Button>
					<Button to="/app/settings" variant="secondary">
						やめる
					</Button>
				</form>
			</div>
		</div>
	);
}
