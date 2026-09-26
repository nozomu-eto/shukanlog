import { useId, useState, type InputHTMLAttributes } from "react";
import styles from "./TextField.module.css";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
	label: string;
	help?: string;
	error?: string;
	id?: string;
}

// パスワード入力欄。右側の「表示/隠す」ボタンで入力内容の表示・非表示を切り替える(aria-pressed)
export function PasswordField({ label, help, error, id, ...inputProps }: PasswordFieldProps) {
	const [shown, setShown] = useState(false);
	const autoId = useId();
	const inputId = id ?? autoId;
	const helpId = help ? `${inputId}-help` : undefined;
	const errorId = error ? `${inputId}-error` : undefined;
	const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

	return (
		<div className={styles.field}>
			<label className={styles.label} htmlFor={inputId}>
				{label}
			</label>
			{help ? (
				<span id={helpId} className={styles.help}>
					{help}
				</span>
			) : null}
			<div className={styles.inputRow}>
				<input
					id={inputId}
					type={shown ? "text" : "password"}
					className={styles.input}
					aria-invalid={error ? true : undefined}
					aria-describedby={describedBy}
					{...inputProps}
				/>
				<button
					type="button"
					className={styles.toggle}
					aria-pressed={shown}
					onClick={() => setShown((v) => !v)}
				>
					{shown ? "隠す" : "表示"}
				</button>
			</div>
			{error ? (
				<p id={errorId} className={styles.error}>
					{error}
				</p>
			) : null}
		</div>
	);
}
