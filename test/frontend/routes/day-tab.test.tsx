import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "../../../src/react-app/api/client";
import { TabsRoute } from "../../../src/react-app/routes/app/tabs";
import { renderAppRoute } from "./render-app-route";

const getSessionMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());
const getDayMock = vi.hoisted(() => vi.fn());
const putHabitLogMock = vi.hoisted(() => vi.fn());
const postCalorieLogMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/lib/auth-client", () => ({ authClient: { getSession: getSessionMock } }));
vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));
vi.mock("../../../src/react-app/api/days", () => ({ getDay: getDayMock }));
vi.mock("../../../src/react-app/api/habit-logs", () => ({ putHabitLog: putHabitLogMock }));
vi.mock("../../../src/react-app/api/calorie-logs", () => ({ postCalorieLog: postCalorieLogMock }));

// 「今日」を2026-09-25に固定する
vi.mock("../../../src/shared/domain/date", async () => {
	const actual = await vi.importActual<typeof import("../../../src/shared/domain/date")>(
		"../../../src/shared/domain/date",
	);
	return { ...actual, todayInTokyo: () => "2026-09-25" };
});

const DATE = "2026-09-25";
const HABITS = [
	{ id: "h1", name: "服薬", kind: "medication", evaluationScale: 2 as const },
	{ id: "h2", name: "運動", kind: "exercise", evaluationScale: 3 as const },
];

// サーバー側の状態を模したもの(日付 → 習慣ID → 結果)と、カロリー記録
let serverResults: Record<string, Record<string, string | null>>;
let serverCalories: { id: string; calories: number; note: string | null }[];

function dayFromServer(date: string) {
	return {
		date,
		habits: HABITS.map((h) => ({ ...h, result: serverResults[date]?.[h.id] ?? null })),
		calories: {
			total: serverCalories.reduce((sum, c) => sum + c.calories, 0),
			items: serverCalories,
		},
	};
}

interface PendingPut {
	params: { habitId: string; date: string; result: string | null };
	succeed: () => void;
	fail: () => void;
}

// putHabitLogを「呼ばれたら保留にして、テストが成功・失敗のタイミングを決める」実装にする。
// 戻り値のputsには、呼ばれた順にPUTが入る(サーバー側の状態は、succeedしたときに変わる)
function holdPuts() {
	const puts: PendingPut[] = [];
	putHabitLogMock.mockImplementation((params: PendingPut["params"]) => {
		return new Promise((resolve, reject) => {
			puts.push({
				params,
				succeed: () => {
					serverResults[params.date] = { ...serverResults[params.date], [params.habitId]: params.result };
					resolve({ ...params });
				},
				fail: () => reject(new Error("network error")),
			});
		});
	});
	return puts;
}

function renderDay(path = `/app?tab=day&date=${DATE}`) {
	return renderAppRoute(path, <TabsRoute />, { withShell: true });
}

// 「画面に戻ってきた」状態を作る(document.visibilityStateをvisibleにしてvisibilitychangeを発火する)
function fireVisibilityChange() {
	Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
	act(() => {
		document.dispatchEvent(new Event("visibilitychange"));
	});
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("日タブ", () => {
	beforeEach(() => {
		serverResults = {};
		serverCalories = [];
		for (const mock of [getSessionMock, getMeMock, getDayMock, putHabitLogMock, postCalorieLogMock]) {
			mock.mockReset();
		}
		getSessionMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
			justCanceledWithdrawal: false,
		});
		getDayMock.mockImplementation((date: string) => Promise.resolve(dayFromServer(date)));
	});

	it("初回ログイン後は記録方法とカロリー設定を案内する", async () => {
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: DATE,
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
			justCanceledWithdrawal: false,
		});
		renderDay();

		expect(await screen.findByRole("heading", { name: "今日の記録をはじめましょう" })).toBeInTheDocument();
		expect(screen.getByText(/ボタンを押すだけで保存されます/)).toBeInTheDocument();
		expect(screen.getByText(/カロリー記録は任意で、設定からオフにできます/)).toBeInTheDocument();
	});

	it("既存利用者には初回案内を表示しない", async () => {
		renderDay();
		await screen.findAllByRole("button", { name: /できた/ });
		expect(screen.queryByRole("heading", { name: "今日の記録をはじめましょう" })).not.toBeInTheDocument();
	});

	it("ボタンを押すと保存され、もう一度押すと取り消される", async () => {
		const user = userEvent.setup();
		putHabitLogMock.mockImplementation((params: PendingPut["params"]) => {
			serverResults[params.date] = { ...serverResults[params.date], [params.habitId]: params.result };
			return Promise.resolve({ ...params });
		});
		renderDay();

		const button = (await screen.findAllByRole("button", { name: /できた/ }))[0];
		await user.click(button);

		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
		expect(putHabitLogMock).toHaveBeenCalledWith({ habitId: "h1", date: DATE, result: "completed" });
		expect(await screen.findByText("保存しました")).toBeInTheDocument();

		await user.click(button);
		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
		expect(putHabitLogMock).toHaveBeenLastCalledWith({ habitId: "h1", date: DATE, result: null });
		expect(await screen.findByText("記録を取り消しました")).toBeInTheDocument();
	});

	it("押した瞬間に表示が変わり(楽観的更新)、保存の完了を待たない", async () => {
		const user = userEvent.setup();
		const puts = holdPuts();
		renderDay();

		const button = (await screen.findAllByRole("button", { name: /できた/ }))[0];
		await user.click(button);

		// PUTはまだ完了していないが、押した状態が表示されている
		expect(button).toHaveAttribute("aria-pressed", "true");
		expect(puts).toHaveLength(1);
		puts[0].succeed();
		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
	});

	it("保存に失敗すると表示が元に戻り、失敗のトーストを出す", async () => {
		const user = userEvent.setup();
		const puts = holdPuts();
		renderDay();

		const button = (await screen.findAllByRole("button", { name: /できた/ }))[0];
		await user.click(button);
		expect(button).toHaveAttribute("aria-pressed", "true");

		puts[0].fail();

		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
		expect(await screen.findByText("保存できませんでした。通信状況を確認して、もう一度お試しください")).toBeInTheDocument();
	});

	it("習慣の記録を保存しても、親の/api/meは取り直さない(保存した日の記録は取り直す)", async () => {
		const user = userEvent.setup();
		putHabitLogMock.mockImplementation((params: PendingPut["params"]) => {
			serverResults[params.date] = { ...serverResults[params.date], [params.habitId]: params.result };
			return Promise.resolve({ ...params });
		});
		renderDay();
		const button = (await screen.findAllByRole("button", { name: /できた/ }))[0];
		const meCalls = getMeMock.mock.calls.length;
		const dayCalls = getDayMock.mock.calls.length;

		await user.click(button);
		await waitFor(() => expect(getDayMock.mock.calls.length).toBeGreaterThan(dayCalls));
		await screen.findByText("保存しました");

		expect(getMeMock.mock.calls.length).toBe(meCalls);
	});

	describe("連打", () => {
		it("同じ習慣を続けて押すと、押した順に1つずつ送られ、最後の操作の結果がサーバーに残る", async () => {
			const user = userEvent.setup();
			const puts = holdPuts();
			renderDay();

			const completed = (await screen.findAllByRole("button", { name: /できた/ }))[0];
			const notCompleted = screen.getAllByRole("button", { name: /できなかった/ })[0];

			// 「できた」→ すぐ「できなかった」(同じ習慣への連続操作)
			await user.click(completed);
			await user.click(notCompleted);

			// 画面は最後の操作の結果になっている
			expect(notCompleted).toHaveAttribute("aria-pressed", "true");
			expect(completed).toHaveAttribute("aria-pressed", "false");
			// 1つ目のPUTが終わるまで、2つ目は送られない
			await flush();
			expect(puts.map((p) => p.params.result)).toEqual(["completed"]);

			puts[0].succeed();
			// 1つ目の送信が新しい送信で中断されていても、2つ目は送られる(中断のsignalは使わない)
			await waitFor(() => expect(puts).toHaveLength(2));
			expect(puts[1].params.result).toBe("not_completed");
			puts[1].succeed();

			await waitFor(() => expect(serverResults[DATE].h1).toBe("not_completed"));
			await waitFor(() => expect(getDayMock.mock.calls.length).toBeGreaterThan(1));
			expect(notCompleted).toHaveAttribute("aria-pressed", "true");
			expect(completed).toHaveAttribute("aria-pressed", "false");
		});

		it("同じボタンを3回押すと、押した順に(できた→取り消し→できた)送られ、最後の「できた」が残る", async () => {
			const user = userEvent.setup();
			const puts = holdPuts();
			renderDay();

			const button = (await screen.findAllByRole("button", { name: /できた/ }))[0];
			await user.click(button);
			await user.click(button);
			await user.click(button);
			expect(button).toHaveAttribute("aria-pressed", "true");

			for (let i = 0; i < 3; i++) {
				await waitFor(() => expect(puts).toHaveLength(i + 1));
				puts[i].succeed();
			}
			expect(puts.map((p) => p.params.result)).toEqual(["completed", null, "completed"]);
			await waitFor(() => expect(serverResults[DATE].h1).toBe("completed"));
			await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
		});

		it("古い操作が失敗しても、新しい操作の表示は巻き戻らない。次の操作は送られ、失敗のトーストは出る", async () => {
			const user = userEvent.setup();
			const puts = holdPuts();
			renderDay();

			const completed = (await screen.findAllByRole("button", { name: /できた/ }))[0];
			const notCompleted = screen.getAllByRole("button", { name: /できなかった/ })[0];
			await user.click(completed);
			await user.click(notCompleted);

			// 1つ目(できた)が失敗する。画面は最後の操作(できなかった)のまま
			puts[0].fail();
			expect(await screen.findByText("保存できませんでした。通信状況を確認して、もう一度お試しください")).toBeInTheDocument();
			expect(notCompleted).toHaveAttribute("aria-pressed", "true");
			expect(completed).toHaveAttribute("aria-pressed", "false");

			// 前の保存が失敗しても、次の保存は送られる
			await waitFor(() => expect(puts).toHaveLength(2));
			puts[1].succeed();
			await waitFor(() => expect(serverResults[DATE].h1).toBe("not_completed"));
			await waitFor(() => expect(notCompleted).toHaveAttribute("aria-pressed", "true"));
		});

		it("違う習慣は互いを待たずに送られる", async () => {
			const user = userEvent.setup();
			const puts = holdPuts();
			renderDay();

			const medication = (await screen.findAllByRole("button", { name: /できた/ }))[0];
			const exercise = (await screen.findAllByRole("button", { name: /できた/ }))[1];
			await user.click(medication);
			await user.click(exercise);

			// 服薬のPUTが終わっていなくても、運動のPUTは送られている
			await waitFor(() => expect(puts).toHaveLength(2));
			expect(puts.map((p) => p.params.habitId)).toEqual(["h1", "h2"]);
			puts[0].succeed();
			puts[1].succeed();
			await waitFor(() => expect(serverResults[DATE]).toEqual({ h1: "completed", h2: "completed" }));
		});

		it("ある習慣の保存が失敗しても、続けて押した別の習慣の表示は巻き戻らない", async () => {
			const user = userEvent.setup();
			const puts = holdPuts();
			renderDay();

			const medication = (await screen.findAllByRole("button", { name: /できた/ }))[0];
			const exercise = (await screen.findAllByRole("button", { name: /できた/ }))[1];
			await user.click(medication);
			await user.click(exercise);
			await waitFor(() => expect(puts).toHaveLength(2));

			puts[0].fail();
			await waitFor(() => expect(medication).toHaveAttribute("aria-pressed", "false"));
			// 運動はまだ保存の途中だが、押した状態のまま
			expect(exercise).toHaveAttribute("aria-pressed", "true");
			puts[1].succeed();
			await waitFor(() => expect(exercise).toHaveAttribute("aria-pressed", "true"));
		});
	});

	it("保存中に画面に戻って再取得が走っても、押した状態が保たれる", async () => {
		const user = userEvent.setup();
		const puts = holdPuts();
		renderDay();

		const button = (await screen.findAllByRole("button", { name: /できた/ }))[0];
		await user.click(button);
		const dayCallsBefore = getDayMock.mock.calls.length;

		// 保存の途中(サーバーはまだ未記録)で画面に戻る。再取得の結果は未記録だが、表示は押した状態のまま
		fireVisibilityChange();
		await waitFor(() => expect(getDayMock.mock.calls.length).toBeGreaterThan(dayCallsBefore));
		await flush();
		expect(button).toHaveAttribute("aria-pressed", "true");

		puts[0].succeed();
		await waitFor(() => expect(serverResults[DATE].h1).toBe("completed"));
		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
	});

	it("画面に戻ると記録を取り直し、他で変更された内容が表示される", async () => {
		renderDay();
		const button = (await screen.findAllByRole("button", { name: /できた/ }))[0];
		expect(button).toHaveAttribute("aria-pressed", "false");

		// 他の端末で記録された
		serverResults[DATE] = { h1: "completed" };
		fireVisibilityChange();

		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
	});

	it("別の日に移動しても、前の日の保存中の表示がその日に紛れ込まない", async () => {
		const user = userEvent.setup();
		const puts = holdPuts();
		const router = renderDay();

		const button = (await screen.findAllByRole("button", { name: /できた/ }))[0];
		await user.click(button);
		expect(button).toHaveAttribute("aria-pressed", "true");

		await router.navigate("/app?tab=day&date=2026-09-24");
		await waitFor(() => expect(getDayMock).toHaveBeenCalledWith("2026-09-24"));
		await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("9月24日"));
		expect(screen.getAllByRole("button", { name: /できた/ })[0]).toHaveAttribute("aria-pressed", "false");

		puts[0].succeed();
		await flush();
	});

	it("記録の取得に失敗したらエラー表示を出し、「再読み込み」で取り直せる", async () => {
		const user = userEvent.setup();
		getDayMock.mockRejectedValueOnce(new ApiError("INTERNAL_ERROR", "サーバーで問題が起きました", 500));
		renderDay();

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("記録を読み込めませんでした");
		expect(alert).toHaveTextContent("サーバーで問題が起きました");

		await user.click(screen.getByRole("button", { name: "再読み込み" }));
		expect((await screen.findAllByRole("button", { name: /できた/ })).length).toBeGreaterThan(0);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("カロリーを保存すると、記録が取り直されて合計が更新され、トーストが出る", async () => {
		const user = userEvent.setup();
		postCalorieLogMock.mockImplementation(({ calories }: { calories: number }) => {
			serverCalories = [...serverCalories, { id: "c1", calories, note: null }];
			return Promise.resolve({ id: "c1", date: DATE, calories, note: null });
		});
		renderDay();

		await user.click(await screen.findByRole("button", { name: /記録する/ }));
		await user.type(screen.getByLabelText("カロリー"), "420");
		await user.click(screen.getByRole("button", { name: "保存する" }));

		// 取り直された記録の一覧に、保存したカロリーの項目が出る
		expect(await screen.findByRole("button", { name: "420kcal を編集" })).toBeInTheDocument();
		expect(await screen.findByText("保存しました")).toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("今日のときは次の日へ進めない", async () => {
		renderDay();

		await screen.findByRole("heading", { level: 1 });
		expect(screen.getByText("今日")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "今日に戻る" })).not.toBeInTheDocument();
		const nextButton = screen.getByLabelText("次の日");
		expect(nextButton).toHaveAttribute("aria-disabled", "true");
		expect(nextButton.tagName).not.toBe("A");
	});

	it("過去日から「今日に戻る」を押すと今日の日タブへ移動する", async () => {
		const user = userEvent.setup();
		renderDay("/app?tab=day&date=2026-09-24");

		const todayLink = await screen.findByRole("link", { name: "今日に戻る" });
		expect(todayLink).toHaveAttribute("href", expect.stringContaining("date=2026-09-25"));

		await user.click(todayLink);
		expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("9月25日");
		expect(screen.getByText("今日")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "今日に戻る" })).not.toBeInTheDocument();
	});
});
