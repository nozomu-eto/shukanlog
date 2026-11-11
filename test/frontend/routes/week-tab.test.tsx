import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WeekTabRoute } from "../../../src/react-app/routes/app/week-tab";
import { ApiError } from "../../../src/react-app/api/client";
import { renderAppRoute } from "./render-app-route";

const getSummaryMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/summary", () => ({ getSummary: getSummaryMock }));
vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));
vi.mock("../../../src/react-app/lib/auth-client", () => ({ authClient: { getSession: getSessionMock } }));

// 「今日」を2026-09-24に固定する(todayInTokyo()は引数省略時に実行環境の現在時刻を使うため、
// 未来のマスの判定など日付に依存するテストが実行日に関わらず安定するようにする)
vi.mock("../../../src/shared/domain/date", async () => {
	const actual = await vi.importActual<typeof import("../../../src/shared/domain/date")>(
		"../../../src/shared/domain/date",
	);
	return { ...actual, todayInTokyo: () => "2026-09-24" };
});

function baseSummary() {
	return {
		habits: [
			{ id: "h1", name: "服薬", kind: "medication", evaluationScale: 2 as const },
			{ id: "h2", name: "運動", kind: "exercise", evaluationScale: 3 as const },
		],
		days: [
			{ date: "2026-09-21", results: { h1: "completed", h2: "partial" }, calories: 1950 },
			{ date: "2026-09-22", results: { h1: "completed", h2: "completed" }, calories: 1700 },
			{ date: "2026-09-23", results: { h1: "not_completed", h2: "not_completed" }, calories: 2100 },
			{ date: "2026-09-24", results: { h1: "completed", h2: "partial" }, calories: 1600 },
		],
		totals: {
			habits: {
				h1: { completed: 3, partial: 0, notCompleted: 1, eligibleDays: 4 },
				h2: { completed: 1, partial: 2, notCompleted: 1, eligibleDays: 4 },
			},
			calories: { average: 1838, recordedDays: 4 },
		},
		accountCreatedDate: "2020-01-01",
	};
}

function renderWeekTab(initialDate = "2026-09-24") {
	return renderAppRoute(`/app?tab=week&date=${initialDate}`, <WeekTabRoute />);
}

describe("WeekTabRoute", () => {
	beforeEach(() => {
		// テスト間で呼び出し回数や実装が残らないようにする
		getSummaryMock.mockReset();
		getMeMock.mockReset();
		getSessionMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
		});
	});

	it.each([
		[1718.4, "1,718"],
		[1718.5, "1,719"],
		[1718.9, "1,719"],
		[1999.9, "2,000"],
		[0, "0"],
	] as const)("平均カロリー %s を %s kcal として表示する", async (average, expected) => {
		getSummaryMock.mockResolvedValue({
			...baseSummary(),
			totals: { ...baseSummary().totals, calories: { average, recordedDays: 4 } },
		});
		renderWeekTab();

		expect(await screen.findByText(expected, { exact: true })).toBeInTheDocument();
	});

	it("平均カロリーがnullなら記録なしと表示する", async () => {
		getSummaryMock.mockResolvedValue({
			...baseSummary(),
			totals: { ...baseSummary().totals, calories: { average: null, recordedDays: 0 } },
		});
		renderWeekTab();

		expect(await screen.findByText("記録なし", { exact: true })).toBeInTheDocument();
	});

	it("期間の見出しを表示する(2026-09-24を含む週: 9/21(月)〜9/27(日))", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderWeekTab();

		expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("9/21(月)〜9/27(日)");
		expect(screen.getByRole("heading", { name: "カロリー" })).toBeInTheDocument();
	});

	it("未来のマスはリンクにならず、今日以前のマスはその日の日タブへのリンクになる", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderWeekTab();

		await screen.findByRole("heading", { name: "習慣" });

		// 今日(9/24)より後の9/25〜9/27は未来のマス(リンクではない)。習慣2件分、それぞれ表示される
		for (const label of ["9月25日 未来の日", "9月26日 未来の日", "9月27日 未来の日"]) {
			for (const el of screen.getAllByLabelText(label)) {
				expect(el).not.toHaveAttribute("href");
			}
		}

		// 今日以前のマスはリンクで、記録の状態を読み上げラベルに含む
		const link = screen.getByLabelText("9月21日 服薬 達成");
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", expect.stringContaining("date=2026-09-21"));
	});

	it("スマホの日付行は各日の状態を名前に含み、今日までの日付を正しい日タブへ案内する", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderWeekTab();

		const expectedDates = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"];
		for (const date of expectedDates) {
			const links = await screen.findAllByRole("link");
			expect(links.some((link) => link.getAttribute("href")?.includes(`date=${date}`))).toBe(true);
		}
		expect(screen.getByRole("link", { name: "9月21日 服薬 達成、運動 一部達成" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "9月24日 服薬 達成、運動 一部達成" }).className).toMatch(/mobileDayToday/);
		expect(screen.getByRole("link", { name: "9月23日 服薬 未達成、運動 未達成" })).toBeInTheDocument();
	});

	it("日付行はキーボードから選択できる", async () => {
		const user = userEvent.setup();
		getSummaryMock.mockResolvedValue(baseSummary());
		const router = renderAppRoute(`/app?tab=week&date=2026-09-24`, <WeekTabRoute />);

		const dayLink = await screen.findByRole("link", { name: "9月21日 服薬 達成、運動 一部達成" });
		dayLink.focus();
		await user.keyboard("{Enter}");
		expect(router.state.location.search).toContain("tab=day");
		expect(router.state.location.search).toContain("date=2026-09-21");
	});

	it("習慣ごとの集計(◯の数・分母、3段階評価は△も)を表示する", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderWeekTab();

		await screen.findByRole("heading", { name: "習慣" });
		expect(screen.getAllByText("/ 4日", { exact: false }).length).toBeGreaterThan(0);
	});

	it("カロリー記録を無効にしている利用者には、カロリーの棒グラフを表示しない", async () => {
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: false },
			consent: { currentVersion: "2026-09-25", agreed: true },
		});
		getSummaryMock.mockResolvedValue({
			...baseSummary(),
			days: baseSummary().days.map((d) => ({ ...d, calories: null })),
			totals: { ...baseSummary().totals, calories: { average: null, recordedDays: 0 } },
		});
		renderWeekTab();

		await screen.findByRole("heading", { name: "習慣" });
		expect(screen.queryByRole("heading", { name: "カロリー" })).not.toBeInTheDocument();
	});

	it("集計の取得に失敗したらエラー表示を出し、「再読み込み」で取得し直せる", async () => {
		const user = userEvent.setup();
		getSummaryMock.mockRejectedValueOnce(new ApiError("INTERNAL_ERROR", "サーバーで問題が起きました", 500));
		getSummaryMock.mockResolvedValue(baseSummary());
		renderWeekTab();

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("記録を読み込めませんでした");
		expect(alert).toHaveTextContent("サーバーで問題が起きました");

		await user.click(screen.getByRole("button", { name: "再読み込み" }));
		await screen.findByRole("heading", { name: "習慣" });
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(getSummaryMock).toHaveBeenCalledTimes(2);
	});

	it("画面を開いたときに/api/meを取得するのは親のloaderの1回だけ", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderWeekTab();

		await screen.findByRole("heading", { name: "習慣" });
		expect(getMeMock).toHaveBeenCalledTimes(1);
	});

	it("最初からweekタブのURLを開くと、取得が終わるまでHydrateFallbackを表示し、そのあとweekタブを表示する", async () => {
		let resolveSummary!: (value: ReturnType<typeof baseSummary>) => void;
		getSummaryMock.mockReturnValue(
			new Promise((resolve) => {
				resolveSummary = resolve;
			}),
		);
		renderWeekTab();

		// 取得中は、親(/app)のHydrateFallbackが表示され、タブの中身はまだ無い
		expect(await screen.findByRole("status", { name: "読み込み中" })).toBeInTheDocument();
		expect(screen.queryByText("服薬")).not.toBeInTheDocument();

		resolveSummary(baseSummary());
		await screen.findByRole("heading", { name: "習慣" });
		expect(screen.queryByRole("status", { name: "読み込み中" })).not.toBeInTheDocument();
	});
});
