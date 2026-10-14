import { useEffect } from "react";
import { useRevalidator } from "react-router";

// 別のタブやアプリから画面に戻ってきたとき(visibilitychangeでvisibleになったとき)、
// 表示中のデータを取り直して最新にする。
// 他の端末での変更や、日付をまたいだ表示を古いままにしないため
export function useRevalidateOnVisible(): void {
	const { revalidate } = useRevalidator();
	useEffect(() => {
		function handleVisibilityChange() {
			if (document.visibilityState === "visible") {
				void revalidate();
			}
		}
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [revalidate]);
}
