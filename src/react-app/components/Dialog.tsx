import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./Dialog.module.css";

interface DialogProps {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
}

// ネイティブのdialog要素とshowModal()を使った共通のダイアログ。
// - Escで閉じる(dialogのcancelイベントの既定動作)
// - 開いたときに最初の入力欄にフォーカスする
// - 閉じたら開いたボタンにフォーカスを戻す
// スマホは下からのシート、PC(1024px以上)は中央のダイアログ(Dialog.module.cssで切り替え)。
// openがfalseの間はdialog自体をDOMに置かない(閉じている状態を単純にする)
export function Dialog({ open, title, onClose, children }: DialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	// ダイアログを開く直前にフォーカスされていた要素(閉じたときに戻す先)
	const previouslyFocusedRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!open) {
			return;
		}
		previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
		const dialog = dialogRef.current;
		if (dialog && !dialog.open) {
			dialog.showModal();
			// 開いたときに最初の入力欄(input/select/textarea)にフォーカスする
			const first = dialog.querySelector<HTMLElement>("input, select, textarea");
			first?.focus();
		}
		return () => {
			// 閉じたら、開いたボタン(ダイアログを開く前にフォーカスされていた要素)にフォーカスを戻す
			previouslyFocusedRef.current?.focus();
		};
	}, [open]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) {
			return;
		}
		// Esc(cancelイベント)・close()呼び出しのどちらでも、閉じたことを呼び出し側に伝える
		const handleClose = () => onClose();
		dialog.addEventListener("close", handleClose);
		return () => dialog.removeEventListener("close", handleClose);
	}, [onClose]);

	if (!open) {
		return null;
	}

	return (
		<dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} aria-modal="true">
			<div className={styles.content}>
				<span aria-hidden="true" className={styles.grabber} />
				<h2 id={titleId} className={styles.title}>
					{title}
				</h2>
				{children}
			</div>
		</dialog>
	);
}
