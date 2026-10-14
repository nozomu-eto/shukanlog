import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MonthTabRoute } from "../../../src/react-app/routes/app/month-tab";
import { ApiError } from "../../../src/react-app/api/client";
import { renderAppRoute } from "./render-app-route";

const getSummaryMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/summary", () => ({ getSummary: getSummaryMock }));
vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));
vi.mock("../../../src/react-app/lib/auth-client", () => ({ authClient: { getSession: getSessionMock } }));

// 「今日」を2026-02-10(2026年2月、1日は日曜)に固定する
vi.mock("../../../src/shared/domain/date", async () => {
	const actual = await vi.importActual<typeof import("../../../src/shared/domain/date")>(
		"../../../src/shared/domain/date",
	);
	return { ...actual, todayInTokyo: () => "2026-02-10" };
});

function baseSummary() {
	return {
		habits: [
			{ id: "h1", name: "服薬", kind: "medication", evaluationScale: 2 as const },
			{ id: "h2", name: "運動", kind: "exercise", evaluationScale: 3 as const },
		],
		days: [
			{ date: "2026-02-01", results: { h1: "completed", h2: "partial" }, calories: 1950 },
			{ date: "2026-02-02", results: { h1: "completed", h2: "completed" }, calories: 1700 },
		],
		totals: {
			habits: {
				h1: { completed: 2, partial: 0, notCompleted: 0, eligibleDays: 10 },
				h2: { completed: 1, partial: 1, notCompleted: 0, eligibleDays: 10 },
			},
			calories: { average: 1825, recordedDays: 2 },
		},
		accountCreatedDate: "2020-01-01",
	};
}

function renderMonthTab(initialDate = "2026-02-10") {
	return renderAppRoute(`/app?tab=month&date=${initialDate}`, <MonthTabRoute />);
}

describe("MonthTabRoute", () => {
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

	it("月初の曜日に合わせた空欄のマスを表示する(2026年2月は1日が日曜・28日が土曜のため、月曜始まりで前月分6マス+翌月分1マス=7マス空欄)", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderMonthTab();

		await screen.findByLabelText("2月1日 服薬 達成 運動 一部達成 1950kcal");
		const grid = document.querySelector("[class*='calendarGrid']");
		expect(grid).not.toBeNull();
		// 空欄マスには読み上げラベルが無いため、DOM構造から直接数える
		const blankCells = grid!.querySelectorAll(":scope > span:empty");
		expect(blankCells.length).toBe(7);
	});

	it("未来のマスはリンクにならない", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderMonthTab();

		await screen.findByLabelText("2月1日 服薬 達成 運動 一部達成 1950kcal");
		const future = screen.getByLabelText("2月11日 未来の日");
		expect(future.tagName).not.toBe("A");
	});

	it("カロリー記録を無効にしている利用者には、マスのカロリー・平均カロリーを表示せず、説明を「左:服薬 右:運動」にする", async () => {
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
		renderMonthTab();

		await screen.findByLabelText("2月1日 服薬 達成 運動 一部達成");
		expect(screen.queryByText("平均カロリー")).not.toBeInTheDocument();
		expect(screen.getAllByText("左:服薬 右:運動", { exact: true }).length).toBeGreaterThan(0);
	});

	it("集計の取得に失敗したらエラー表示を出し、「再読み込み」で取得し直せる", async () => {
		const user = userEvent.setup();
		getSummaryMock.mockRejectedValueOnce(new ApiError("INTERNAL_ERROR", "サーバーで問題が起きました", 500));
		getSummaryMock.mockResolvedValue(baseSummary());
		renderMonthTab();

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("記録を読み込めませんでした");
		expect(alert).toHaveTextContent("サーバーで問題が起きました");

		await user.click(screen.getByRole("button", { name: "再読み込み" }));
		await screen.findByText("服薬");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(getSummaryMock).toHaveBeenCalledTimes(2);
	});

	it("画面を開いたときに/api/meを取得するのは親のloaderの1回だけ", async () => {
		getSummaryMock.mockResolvedValue(baseSummary());
		renderMonthTab();

		await screen.findByText("服薬");
		expect(getMeMock).toHaveBeenCalledTimes(1);
	});
});
