import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../src/react-app/api/client";
import { resolveTabDate, tabsLoader } from "../../../src/react-app/routes/app/tabs-loader";

const getDayMock = vi.hoisted(() => vi.fn());
const getSummaryMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/days", () => ({ getDay: getDayMock }));
vi.mock("../../../src/react-app/api/summary", () => ({ getSummary: getSummaryMock }));

// 「今日」を2026-09-24に固定する
vi.mock("../../../src/shared/domain/date", async () => {
	const actual = await vi.importActual<typeof import("../../../src/shared/domain/date")>(
		"../../../src/shared/domain/date",
	);
	return { ...actual, todayInTokyo: () => "2026-09-24" };
});

// loaderに渡す引数のうち、使うrequestだけを作る
function args(search: string) {
	return { request: new Request(`http://localhost/app${search}`) };
}

describe("resolveTabDate", () => {
	it("有効な過去の日付はそのまま使う", () => {
		expect(resolveTabDate("2026-09-01", "2026-09-24")).toBe("2026-09-01");
	});

	it("無い・不正な形式・未来の日付は今日にする", () => {
		expect(resolveTabDate(null, "2026-09-24")).toBe("2026-09-24");
		expect(resolveTabDate("2026-13-40", "2026-09-24")).toBe("2026-09-24");
		expect(resolveTabDate("abc", "2026-09-24")).toBe("2026-09-24");
		expect(resolveTabDate("2026-09-25", "2026-09-24")).toBe("2026-09-24");
	});
});

describe("tabsLoader", () => {
	beforeEach(() => {
		getDayMock.mockReset();
		getSummaryMock.mockReset();
	});

	it("tabが無い・不明な場合は日タブとして、指定日の記録を取得する", async () => {
		getDayMock.mockResolvedValue({ date: "2026-09-20" });
		const data = await tabsLoader(args("?date=2026-09-20"));
		expect(data).toEqual({ tab: "day", date: "2026-09-20", result: { data: { date: "2026-09-20" } } });
		expect(getDayMock).toHaveBeenCalledWith("2026-09-20");
		expect(getSummaryMock).not.toHaveBeenCalled();
	});

	it("週タブは、その日を含む週(月曜〜日曜)の集計を取得する", async () => {
		getSummaryMock.mockResolvedValue({ habits: [] });
		const data = await tabsLoader(args("?tab=week&date=2026-09-24"));
		expect(data).toEqual({ tab: "week", result: { data: { habits: [] } } });
		expect(getSummaryMock).toHaveBeenCalledWith("2026-09-21", "2026-09-27");
		expect(getDayMock).not.toHaveBeenCalled();
	});

	it("月タブは、その日を含む月の集計を取得する", async () => {
		getSummaryMock.mockResolvedValue({ habits: [] });
		await tabsLoader(args("?tab=month&date=2026-09-24"));
		expect(getSummaryMock).toHaveBeenCalledWith("2026-09-01", "2026-09-30");
	});

	it("取得に失敗しても例外にせず、画面に出す文言を{ error }で返す(日・週・月とも)", async () => {
		getDayMock.mockRejectedValue(new ApiError("INTERNAL_ERROR", "サーバーで問題が起きました", 500));
		getSummaryMock.mockRejectedValue(new Error("network"));

		expect(await tabsLoader(args("?tab=day"))).toEqual({
			tab: "day",
			date: "2026-09-24",
			result: { error: "サーバーで問題が起きました" },
		});
		const week = await tabsLoader(args("?tab=week"));
		expect(week.tab).toBe("week");
		expect("result" in week && "error" in week.result).toBe(true);
	});
});
