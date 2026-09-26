import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./Toast.module.css";

interface ToastContextValue {
	// 画面のどこからでもトーストを表示できるようにする関数。2秒で自動的に消える
	showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 2000;

// アプリ全体に1つだけ置く、トースト表示の仕組み。
// docs/design.md 6章・7章(「保存しました」「記録を取り消しました」等)で使う
export function ToastProvider({ children }: { children: ReactNode }) {
	const [message, setMessage] = useState<string | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showToast = useCallback((text: string) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		setMessage(text);
		timerRef.current = setTimeout(() => {
			setMessage(null);
		}, TOAST_DURATION_MS);
	}, []);

	const value = useMemo(() => ({ showToast }), [showToast]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className={styles.container} role="status" aria-live="polite">
				{message ? <span className={styles.toast}>{message}</span> : null}
			</div>
		</ToastContext.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components -- コンポーネントと同じファイルでhookを提供する構成にしている(StatusIconと同じ方針)
export function useToast(): ToastContextValue {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToastはToastProviderの内側で使ってください");
	}
	return context;
}
