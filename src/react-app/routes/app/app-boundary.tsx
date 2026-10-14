import { useRevalidator } from "react-router";
import { Button } from "../../components/Button";
import { Skeleton } from "../../components/Skeleton";
import styles from "./app-boundary.module.css";

// 初回表示でloaderの結果を待つ間に出す画面(HydrateFallback)。
// ログイン・同意の判定が終わるまで本体を描画しないため、枠だけの読み込み表示にする
export function AppHydrateFallback() {
	return (
		<div className={styles.page} role="status" aria-label="読み込み中">
			<Skeleton height={48} />
			<Skeleton height={240} />
		</div>
	);
}

// /app親ルートのloaderが失敗したとき(/api/meの取得失敗など)の画面。
// 内部のエラー内容は出さず、「再読み込み」ボタンでloaderをやり直せるようにする。
// errorElementの中でuseRevalidator().revalidate()を使う書き方は、React Router 7.18.4の同梱ドキュメントには
// 記述が無い。動作はtest/frontend/routes/app-loader.test.tsxの「失敗→再読み込み→成功」で確認している
export function AppErrorElement() {
	const revalidator = useRevalidator();
	return (
		<div className={styles.page} role="alert">
			<p className={styles.message}>読み込めませんでした。</p>
			<Button type="button" disabled={revalidator.state === "loading"} onClick={() => revalidator.revalidate()}>
				再読み込み
			</Button>
		</div>
	);
}
