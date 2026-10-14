import { useEffect } from "react";
import { useToast } from "../components/Toast";
import { onHabitLogSaved } from "./habit-log-queue";

// 習慣の記録の保存が1回終わるたびに、結果のトーストを出す。
// fetcherは同じ習慣への新しい送信で中断されると結果を受け取れないため、
// 保存ごとの結果は、保存の処理側(habit-log-queue)からの通知で受ける。
// 日・週・月のどのタブでも出せるよう、全タブに共通のTabsRouteで使う
export function useHabitLogSavedToast(): void {
	const { showToast } = useToast();
	useEffect(
		() =>
			onHabitLogSaved((saveResult) => {
				if (!saveResult.ok) {
					showToast("保存できませんでした。通信状況を確認して、もう一度お試しください");
					return;
				}
				showToast(saveResult.result === null ? "記録を取り消しました" : "保存しました");
			}),
		[showToast],
	);
}
