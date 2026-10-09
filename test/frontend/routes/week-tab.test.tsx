import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WeekTabRoute } from "../../../src/react-app/routes/app/week-tab";

const getSummaryMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/summary", () => ({ getSummary: getSummaryMock }));
vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));

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
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[`/app?tab=week&date=${initialDate}`]}>
				<Routes>
					<Route path="/app" element={<WeekTabRoute />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("WeekTabRoute", () => {
	beforeEach(() => {
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
		});
	});

	it("期間の見出しを表示する(2026-09-24を含む週: 9/21(月)〜9/27(日))", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderWeekTab();

		expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("9/21(月)〜9/27(日)");
	});

	it("未来のマスはリンクにならず、今日以前のマスはその日の日タブへのリンクになる", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderWeekTab();

		await screen.findByText("服薬");

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

	it("習慣ごとの集計(◯の数・分母、3段階評価は△も)を表示する", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderWeekTab();

		await screen.findByText("服薬");
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

		await screen.findByText("服薬");
		expect(screen.queryByRole("heading", { name: "カロリー" })).not.toBeInTheDocument();
	});
});
