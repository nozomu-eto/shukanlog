import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DayTabRoute } from "../../../src/react-app/routes/app/day-tab";
import { ToastProvider } from "../../../src/react-app/components/Toast";

const getDayMock = vi.hoisted(() => vi.fn());
const putHabitLogMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/days", () => ({ getDay: getDayMock }));
vi.mock("../../../src/react-app/api/habit-logs", () => ({ putHabitLog: putHabitLogMock }));
vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));

function baseDay() {
	return {
		date: "2026-09-25",
		habits: [
			{ id: "h1", name: "服薬", kind: "medication", evaluationScale: 2 as const, result: null },
			{ id: "h2", name: "運動", kind: "exercise", evaluationScale: 3 as const, result: null },
		],
		calories: null,
	};
}

function renderDayTab() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const view = render(
		<QueryClientProvider client={queryClient}>
			<ToastProvider>
				<MemoryRouter initialEntries={["/app?tab=day"]}>
					<Routes>
						<Route path="/app" element={<DayTabRoute />} />
					</Routes>
				</MemoryRouter>
			</ToastProvider>
		</QueryClientProvider>,
	);
	return { ...view, queryClient };
}

// 保留中のPromiseを外から解決・拒否できるようにするヘルパー(mutationの完了タイミングを制御するため)
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe("DayTabRoute", () => {
	beforeEach(() => {
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
		});
	});

	it("ボタンを押すと保存され、もう一度押すと取り消される", async () => {
		const user = userEvent.setup();
		// サーバー側の状態を模したday(onSettledのinvalidateQueriesによる再取得が、保存後の
		// 実際の値と一致するようにする)
		const day = baseDay();
		getDayMock.mockImplementation(() => Promise.resolve(structuredClone(day)));
		putHabitLogMock.mockImplementation(({ habitId, result }: { habitId: string; result: string | null }) => {
			day.habits = day.habits.map((h) => (h.id === habitId ? { ...h, result: result as null } : h));
			return Promise.resolve({ habitId, date: day.date, result });
		});

		renderDayTab();

		const buttons = await screen.findAllByRole("button", { name: /できた/ });
		const button = buttons[0];
		await user.click(button);

		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
		expect(putHabitLogMock).toHaveBeenCalledWith({ habitId: "h1", date: expect.any(String), result: "completed" });
		expect(await screen.findByRole("status")).toHaveTextContent("保存しました");

		await user.click(button);
		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
		expect(await screen.findByRole("status")).toHaveTextContent("記録を取り消しました");
	});

	it("保存に失敗すると表示が元に戻る", async () => {
		const user = userEvent.setup();
		getDayMock.mockResolvedValue(baseDay());
		putHabitLogMock.mockRejectedValue(new Error("network error"));

		renderDayTab();

		const buttons = await screen.findAllByRole("button", { name: /できた/ });
		const button = buttons[0];
		await user.click(button);

		// 楽観的更新でいったん押された状態になり、失敗後に元に戻る
		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
		expect(await screen.findByRole("status")).toHaveTextContent(
			"保存できませんでした。通信状況を確認して、もう一度お試しください",
		);
	});

	it("保存中に画面に戻ったこと等による再取得が重なっても、押した状態が保たれる", async () => {
		const user = userEvent.setup();
		const day = baseDay();
		const staleRefetch = deferred<ReturnType<typeof baseDay>>();
		getDayMock.mockImplementation(() => Promise.resolve(structuredClone(day)));
		putHabitLogMock.mockImplementation(({ habitId, result }: { habitId: string; result: string | null }) => {
			day.habits = day.habits.map((h) => (h.id === habitId ? { ...h, result: result as null } : h));
			return Promise.resolve({ habitId, date: day.date, result });
		});

		const { queryClient } = renderDayTab();

		const buttons = await screen.findAllByRole("button", { name: /できた/ });
		const button = buttons[0];

		// 画面に戻ったこと等をきっかけに、記録の再取得(refetchOnWindowFocus相当)が進行中になる
		getDayMock.mockReturnValueOnce(staleRefetch.promise);
		queryClient.refetchQueries({ queryKey: ["day", "2026-09-25"] });

		// その最中に記録ボタンを押す。onMutateのcancelQueriesで進行中の再取得がキャンセルされるため、
		// 古い取得結果(未記録)が後から解決しても、楽観的更新(押した状態)が上書きされない
		await user.click(button);
		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));

		staleRefetch.resolve(baseDay());
		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
	});

	it("同じ習慣への連続操作は、最後の操作の結果が画面に残る(1回目が2回目より後に失敗しても上書きしない)", async () => {
		const user = userEvent.setup();
		const first = deferred<{ habitId: string; date: string; result: string | null }>();
		const second = deferred<{ habitId: string; date: string; result: string | null }>();
		getDayMock.mockResolvedValue(baseDay());
		putHabitLogMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

		renderDayTab();

		const completedButtons = await screen.findAllByRole("button", { name: /できた/ });
		const notCompletedButtons = screen.getAllByRole("button", { name: /できなかった/ });
		const completedButton = completedButtons[0];
		const notCompletedButton = notCompletedButtons[0];

		// 1回目: 「できた」を押す → 2回目: 素早く「できなかった」を押す(同じ習慣への連続操作)
		await user.click(completedButton);
		await user.click(notCompletedButton);

		// scopeにより2回目は1回目の完了を待つため、この時点では2回目の楽観的更新(できなかった)が画面に出ている
		await waitFor(() => expect(notCompletedButton).toHaveAttribute("aria-pressed", "true"));

		// 2回目(できなかった)が先に成功し、その後に1回目(できた)が失敗しても、
		// 1回目のロールバックが2回目の状態を消してはならない
		second.resolve({ habitId: "h1", date: "2026-09-25", result: "not_completed" });
		await waitFor(() => expect(notCompletedButton).toHaveAttribute("aria-pressed", "true"));

		first.reject(new Error("network error"));

		// scopeにより1回目の失敗処理の後で2回目(既に成功している)の保存処理が続けて走るため、
		// 最終的に画面に残るのは2回目の「できなかった」の状態
		await waitFor(() => expect(notCompletedButton).toHaveAttribute("aria-pressed", "true"));
		expect(completedButton).toHaveAttribute("aria-pressed", "false");
	});

	it("記録を保存すると、週・月タブの集計(summaryクエリ)のキャッシュも無効化される", async () => {
		const user = userEvent.setup();
		getDayMock.mockResolvedValue(baseDay());
		putHabitLogMock.mockResolvedValue({ habitId: "h1", date: "2026-09-25", result: "completed" });

		const { queryClient } = renderDayTab();
		// 週タブを表示した際に作られるキャッシュを模して事前にセットしておく
		queryClient.setQueryData(["summary", "2026-09-21", "2026-09-27"], { habits: [] });

		const buttons = await screen.findAllByRole("button", { name: /できた/ });
		await user.click(buttons[0]);

		await waitFor(() =>
			expect(queryClient.getQueryState(["summary", "2026-09-21", "2026-09-27"])?.isInvalidated).toBe(true),
		);
	});

	it("今日のときは次の日へ進めない", async () => {
		getDayMock.mockResolvedValue(baseDay());
		renderDayTab();

		await screen.findByRole("heading", { level: 1 });
		const nextButton = screen.getByLabelText("次の日");
		expect(nextButton).toHaveAttribute("aria-disabled", "true");
		expect(nextButton.tagName).not.toBe("A");
	});
});
