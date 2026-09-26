import { useId, type InputHTMLAttributes } from "react";
import styles from "./TextField.module.css";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
	label: string;
	// 補足説明(例: 「8文字以上」)。任意
	help?: string;
	// エラー文言。無ければエラー表示をしない
	error?: string;
	id?: string;
}

// ラベル・補足説明・エラー表示を含む入力欄。
// aria-invalid・aria-describedbyで入力欄とエラー文を関連付ける(docs/design.md 6章)
export function TextField({ label, help, error, id, ...inputProps }: TextFieldProps) {
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
			<input
				id={inputId}
				className={styles.input}
				aria-invalid={error ? true : undefined}
				aria-describedby={describedBy}
				{...inputProps}
			/>
			{error ? (
				<p id={errorId} className={styles.error}>
					{error}
				</p>
			) : null}
		</div>
	);
}
