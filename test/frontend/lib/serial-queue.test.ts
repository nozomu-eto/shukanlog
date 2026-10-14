import { describe, expect, it } from "vitest";
import { createSerialQueue } from "../../../src/react-app/lib/serial-queue";

// 外から解決・拒否できるPromise(処理の完了タイミングを制御するため)
function deferred<T = void>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

// マイクロタスクを一通り流す
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createSerialQueue", () => {
	it("同じキーの処理は、積んだ順に1つずつ実行される", async () => {
		const queue = createSerialQueue();
		const log: string[] = [];
		const first = deferred();
		const second = deferred();

		const p1 = queue.enqueue("h1", () => {
			log.push("start 1");
			return first.promise.then(() => log.push("end 1"));
		});
		const p2 = queue.enqueue("h1", () => {
			log.push("start 2");
			return second.promise.then(() => log.push("end 2"));
		});

		await flush();
		// 1つ目が終わるまで、2つ目は始まらない
		expect(log).toEqual(["start 1"]);
		first.resolve();
		await flush();
		expect(log).toEqual(["start 1", "end 1", "start 2"]);
		second.resolve();
		await Promise.all([p1, p2]);
		expect(log).toEqual(["start 1", "end 1", "start 2", "end 2"]);
	});

	it("前の処理が失敗しても、次の処理は実行される。失敗は積んだ側にだけ伝わる", async () => {
		const queue = createSerialQueue();
		const first = deferred();
		const ran: string[] = [];

		const p1 = queue.enqueue("h1", () => first.promise);
		const p2 = queue.enqueue("h1", async () => {
			ran.push("2");
			return "ok";
		});
		// 未処理の拒否にならないよう、先に結果の確認を仕掛けておく
		const p1Result = expect(p1).rejects.toThrow("network error");

		first.reject(new Error("network error"));
		await p1Result;
		expect(await p2).toBe("ok");
		expect(ran).toEqual(["2"]);
	});

	it("違うキーの処理は、互いを待たずに実行される", async () => {
		const queue = createSerialQueue();
		const started: string[] = [];
		const blocker = deferred();

		const p1 = queue.enqueue("h1", () => {
			started.push("h1");
			return blocker.promise;
		});
		const p2 = queue.enqueue("h2", async () => {
			started.push("h2");
		});

		await p2;
		// h1がまだ終わっていなくても、h2は実行された
		expect(started).toEqual(["h1", "h2"]);
		blocker.resolve();
		await p1;
	});
});
