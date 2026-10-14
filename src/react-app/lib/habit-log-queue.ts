import type { HabitLogResult } from "../../shared/types";
import { putHabitLog } from "../api/habit-logs";
import { createSerialQueue } from "./serial-queue";

// 保存1回の結果。失敗の詳細は画面に出さないため、成功したかどうかだけを持つ
export type HabitLogSaveResult = { ok: true; result: HabitLogResult | null } | { ok: false };

// 習慣の記録の保存(PUT)を習慣ごとに順番に送るキュー。
// 同じ習慣を素早く連打しても、押した順にサーバーへ届き、最後の操作の結果がサーバーに残る。
// 違う習慣同士は待たない
const queue = createSerialQueue();
const savedListeners = new Set<(saveResult: HabitLogSaveResult) => void>();

// 習慣の記録を保存する。キューの中で順番を待って送り、結果を登録済みの関数にも知らせる。
// 呼び出し元の画面(fetcher)が閉じられたり、新しい送信で中断されたりしても、
// 保存自体は最後まで送る(中断のsignalは渡さない)
export async function saveHabitLog(params: {
	habitId: string;
	date: string;
	result: HabitLogResult | null;
}): Promise<HabitLogSaveResult> {
	let saveResult: HabitLogSaveResult;
	try {
		await queue.enqueue(params.habitId, () => putHabitLog(params));
		saveResult = { ok: true, result: params.result };
	} catch {
		saveResult = { ok: false };
	}
	for (const listener of [...savedListeners]) {
		listener(saveResult);
	}
	return saveResult;
}

// 保存が1回終わるたびに呼ぶ関数を登録する(トースト表示用)。戻り値の関数で解除する。
// 画面のfetcherは新しい送信で中断されると結果を受け取れないため、結果の通知はこちらで受ける
export function onHabitLogSaved(listener: (saveResult: HabitLogSaveResult) => void): () => void {
	savedListeners.add(listener);
	return () => {
		savedListeners.delete(listener);
	};
}
