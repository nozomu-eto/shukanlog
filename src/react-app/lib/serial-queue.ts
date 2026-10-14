// キーごとに処理を1つずつ順番に実行するキューを作る。
// 同じキーの処理は、前の処理が終わる(成功でも失敗でも)まで始まらない。
// 違うキー同士は互いを待たずに並行して実行する。
// 習慣の記録の保存(PUT)を、習慣ごとに発生順に送るために使う
export function createSerialQueue() {
	// キーごとの「最後に積んだ処理の終了」を表すPromise。成功・失敗のどちらでも解決する(失敗は伝えない)
	const tails = new Map<string, Promise<void>>();

	// 処理をキューに積む。戻り値のPromiseは、その処理の結果(失敗ならその例外)になる。
	// 前の処理が失敗していても、次の処理は送る
	function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
		const previous = tails.get(key) ?? Promise.resolve();
		const run = previous.then(task);
		const tail = run
			.then(
				() => undefined,
				() => undefined,
			)
			.then(() => {
				// 自分より後に積まれた処理がなければ、キーの記録を片付ける
				if (tails.get(key) === tail) {
					tails.delete(key);
				}
			});
		tails.set(key, tail);
		return run;
	}

	return { enqueue };
}
