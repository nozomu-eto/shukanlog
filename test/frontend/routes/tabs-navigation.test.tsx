import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TabsRoute } from "../../../src/react-app/routes/app/tabs";
import { deferred } from "../deferred";
import { renderAppRoute } from "./render-app-route";

const getSessionMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());
const getSummaryMock = vi.hoisted(() => vi.fn());
const getDayMock = vi.hoisted(() => vi.fn());
const putHabitLogMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/lib/auth-client", () => ({ authClient: { getSession: getSessionMock } }));
vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));
vi.mock("../../../src/react-app/api/summary", () => ({ getSummary: getSummaryMock }));
vi.mock("../../../src/react-app/api/days", () => ({ getDay: getDayMock }));
vi.mock("../../../src/react-app/api/habit-logs", () => ({ putHabitLog: putHabitLogMock }));

// 「今日」を2026-09-24に固定する
vi.mock("../../../src/shared/domain/date", async () => {
	const actual = await vi.importActual<typeof import("../../../src/shared/domain/date")>(
		"../../../src/shared/domain/date",
	);
	return { ...actual, todayInTokyo: () => "2026-09-24" };
});

const HABITS = [
	{ id: "h1", name: "服薬", kind: "medication", evaluationScale: 2 as const },
	{ id: "h2", name: "運動", kind: "exercise", evaluationScale: 3 as const },
];

// サーバー側の記録を模した状態。日タブの保存(PUT)でここが変わり、週タブの集計(GET /api/summary)にも反映される
let serverResults: Record<string, string | null>;

function summaryFromServer() {
	return {
		habits: HABITS,
		days: [{ date: "2026-09-24", results: serverResults, calories: null }],
		totals: {
			habits: {
				h1: { completed: serverResults.h1 === "completed" ? 1 : 0, partial: 0, notCompleted: 0, eligibleDays: 1 },
				h2: { completed: 0, partial: 0, notCompleted: 0, eligibleDays: 1 },
			},
			calories: { average: null, recordedDays: 0 },
		},
		accountCreatedDate: "2020-01-01",
	};
}

describe("タブの移動", () => {
	beforeEach(() => {
		serverResults = {};
		for (const mock of [getSessionMock, getMeMock, getSummaryMock, getDayMock, putHabitLogMock]) {
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
		getDayMock.mockImplementation(() =>
			Promise.resolve({
				date: "2026-09-24",
				habits: HABITS.map((h) => ({ ...h, result: serverResults[h.id] ?? null })),
				calories: null,
			}),
		);
		putHabitLogMock.mockImplementation(({ habitId, result }: { habitId: string; result: string | null }) => {
			serverResults = { ...serverResults, [habitId]: result };
			return Promise.resolve({ habitId, date: "2026-09-24", result });
		});
		getSummaryMock.mockImplementation(() => Promise.resolve(summaryFromServer()));
	});

	it("日タブで保存したあと週タブに切り替えると、保存した内容が集計に表示される", async () => {
		const user = userEvent.setup();
		renderAppRoute("/app?tab=day&date=2026-09-24", <TabsRoute />, { withShell: true });

		const buttons = await screen.findAllByRole("button", { name: /できた/ });
		await user.click(buttons[0]);
		await waitFor(() => expect(putHabitLogMock).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(buttons[0]).toHaveAttribute("aria-pressed", "true"));

		const meCallsBeforeSwitch = getMeMock.mock.calls.length;
		await user.click(within(screen.getByRole("navigation", { name: "表示期間" })).getByRole("link", { name: "週" }));

		// 週タブの集計はloaderがタブ切り替えのたびに取得し直すため、保存直後の内容が表示される
		expect(await screen.findByLabelText("9月24日 服薬 達成")).toBeInTheDocument();
		expect(getSummaryMock).toHaveBeenCalledTimes(1);
		// タブを切り替えても、親のshouldRevalidateがfalseを返すので/api/meは取り直さない
		expect(getMeMock.mock.calls.length).toBe(meCallsBeforeSwitch);
	});

	it("保存が終わる前に週タブへ切り替えても、保存が終わったあとに最新の集計が表示される", async () => {
		const user = userEvent.setup();
		// 保存(PUT)を保留にして、完了のタイミングをテストで決める
		let finishSave!: () => void;
		putHabitLogMock.mockImplementation(({ habitId, result }: { habitId: string; result: string | null }) => {
			return new Promise((resolve) => {
				finishSave = () => {
					serverResults = { ...serverResults, [habitId]: result };
					resolve({ habitId, date: "2026-09-24", result });
				};
			});
		});
		renderAppRoute("/app?tab=day&date=2026-09-24", <TabsRoute />, { withShell: true });

		const buttons = await screen.findAllByRole("button", { name: /できた/ });
		await user.click(buttons[0]);
		await waitFor(() => expect(putHabitLogMock).toHaveBeenCalledTimes(1));

		// 保存の途中で週タブへ切り替える。このとき取得した集計は、まだ保存前の内容
		await user.click(within(screen.getByRole("navigation", { name: "表示期間" })).getByRole("link", { name: "週" }));
		expect(await screen.findByLabelText("9月24日 服薬 未記録")).toBeInTheDocument();

		// 保存が終わると、React Routerがfetcher(日タブを離れて閉じられた後でも)の保存完了後にloaderを取り直し、
		// 週タブの集計が最新の内容になる
		finishSave();
		expect(await screen.findByLabelText("9月24日 服薬 達成")).toBeInTheDocument();
	});

	it("日タブで取り消したあと月タブに切り替えると、取り消した内容が集計に表示される", async () => {
		const user = userEvent.setup();
		serverResults = { h1: "completed" };
		renderAppRoute("/app?tab=day&date=2026-09-24", <TabsRoute />, { withShell: true });

		const buttons = await screen.findAllByRole("button", { name: /できた/ });
		await waitFor(() => expect(buttons[0]).toHaveAttribute("aria-pressed", "true"));
		await user.click(buttons[0]);
		await waitFor(() => expect(buttons[0]).toHaveAttribute("aria-pressed", "false"));
		await waitFor(() => expect(putHabitLogMock).toHaveBeenCalledTimes(1));

		await user.click(within(screen.getByRole("navigation", { name: "表示期間" })).getByRole("link", { name: "月" }));

		expect(await screen.findByLabelText(/9月24日 服薬 未記録/)).toBeInTheDocument();
	});

	it("週タブの移動中は、移動前の画面を残したまま「読み込み中」の表示を出し、取得が終わると消える", async () => {
		const user = userEvent.setup();
		renderAppRoute("/app?tab=week&date=2026-09-24", <TabsRoute />, { withShell: true });
		await screen.findByLabelText("9月24日 服薬 未記録");
		const status = screen.getByRole("status", { name: "画面の読み込み状況" });
		expect(status).toHaveTextContent("");

		// 前の週の取得を保留にして、移動中の状態を確認する
		const pending = deferred<ReturnType<typeof summaryFromServer>>();
		getSummaryMock.mockReturnValueOnce(pending.promise);
		await user.click(screen.getByRole("link", { name: "前の週" }));

		await waitFor(() => expect(status).toHaveTextContent("読み込み中"));
		// 移動前(今週)の画面が残っている
		expect(screen.getByLabelText("9月24日 服薬 未記録")).toBeInTheDocument();

		pending.resolve({ ...summaryFromServer(), days: [] });
		await waitFor(() => expect(status).toHaveTextContent(""));
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("9/14(月)〜9/20(日)");
	});

	it("タブの切り替え中も「読み込み中」の表示を出す", async () => {
		const user = userEvent.setup();
		renderAppRoute("/app?tab=week&date=2026-09-24", <TabsRoute />, { withShell: true });
		await screen.findByLabelText("9月24日 服薬 未記録");

		const pending = deferred<ReturnType<typeof summaryFromServer>>();
		getSummaryMock.mockReturnValueOnce(pending.promise);
		await user.click(within(screen.getByRole("navigation", { name: "表示期間" })).getByRole("link", { name: "月" }));

		await waitFor(() => expect(screen.getByRole("status", { name: "画面の読み込み状況" })).toHaveTextContent("読み込み中"));
		pending.resolve(summaryFromServer());
		await waitFor(() => expect(screen.getByRole("status", { name: "画面の読み込み状況" })).toHaveTextContent(""));
	});

	it("週から過去日へ移動し、連続する日を編集しても元の週へ戻れる", async () => {
		const user = userEvent.setup();
		const router = renderAppRoute("/app?tab=week&date=2026-09-14", <TabsRoute />, { withShell: true });

		const weekDateLinks = await screen.findAllByRole("link", { name: /9月14日 服薬 未記録/ });
		await user.click(weekDateLinks[0]);
		expect(await screen.findByRole("heading", { level: 1, name: "9月14日(月)" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "週の表示に戻る" })).toHaveAttribute("href", "/app?tab=week&date=2026-09-14");
		const medication = (await screen.findAllByRole("button", { name: /できた/ }))[0];
		await user.click(medication);
		await waitFor(() => expect(putHabitLogMock).toHaveBeenCalledWith({ habitId: "h1", date: "2026-09-14", result: "completed" }));

		await user.click(screen.getByRole("link", { name: "次の日" }));
		expect(await screen.findByRole("heading", { level: 1, name: "9月15日(火)" })).toBeInTheDocument();
		await user.click(screen.getByRole("link", { name: "次の日" }));
		expect(await screen.findByRole("heading", { level: 1, name: "9月16日(水)" })).toBeInTheDocument();
		await user.click(screen.getByRole("link", { name: "週の表示に戻る" }));
		expect(await screen.findByRole("heading", { level: 1, name: "9/14(月)〜9/20(日)" })).toBeInTheDocument();

		await router.navigate(-1);
		expect(await screen.findByRole("heading", { level: 1, name: "9月16日(水)" })).toBeInTheDocument();
	});

	it("月から日へ移動して元の月へ戻れる", async () => {
		const user = userEvent.setup();
		renderAppRoute("/app?tab=month&date=2026-08-01", <TabsRoute />, { withShell: true });

		await user.click(await screen.findByRole("link", { name: /8月1日 服薬/ }));
		expect(await screen.findByRole("heading", { level: 1, name: "8月1日(土)" })).toBeInTheDocument();
		await user.click(screen.getByRole("link", { name: "月の表示に戻る" }));
		expect(await screen.findByRole("heading", { level: 1, name: "2026年8月" })).toBeInTheDocument();
	});

	it("直接URLで日タブを開いた場合は期間への戻り導線を表示しない", async () => {
		renderAppRoute("/app?tab=day&date=2026-09-14", <TabsRoute />, { withShell: true });

		await screen.findByRole("heading", { level: 1, name: "9月14日(月)" });
		expect(screen.queryByRole("link", { name: /の表示に戻る/ })).not.toBeInTheDocument();
	});
});
