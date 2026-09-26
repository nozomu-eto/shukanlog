import { describe, expect, it } from "vitest";
import {
	canGoToNextPeriod,
	canReturnToToday,
	countEligibleDays,
	formatMonthPeriodDisplay,
	formatWeekPeriodDisplay,
	getMonthCalendarCells,
	getMonthRange,
	getNextPeriodDate,
	getPeriodRange,
	getPreviousPeriodDate,
	getWeekRange,
} from "../../../../src/shared/domain/period";

describe("getWeekRange", () => {
	it("月曜〜日曜の範囲を返す(週の途中の日を渡しても同じ範囲になる)", () => {
		expect(getWeekRange("2026-09-23")).toEqual({ start: "2026-09-21", end: "2026-09-27" });
		expect(getWeekRange("2026-09-21")).toEqual({ start: "2026-09-21", end: "2026-09-27" });
		expect(getWeekRange("2026-09-27")).toEqual({ start: "2026-09-21", end: "2026-09-27" });
	});

	it("年をまたぐ週も正しく計算できる", () => {
		expect(getWeekRange("2026-12-31")).toEqual({ start: "2026-12-28", end: "2027-01-03" });
	});
});

describe("getMonthRange", () => {
	it("月初〜月末の範囲を返す", () => {
		expect(getMonthRange("2026-09-15")).toEqual({ start: "2026-09-01", end: "2026-09-30" });
	});

	it("2月はうるう年かどうかで月末が変わる", () => {
		expect(getMonthRange("2026-02-10")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
		expect(getMonthRange("2028-02-10")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
	});
});

describe("getMonthCalendarCells", () => {
	it("2026年2月(28日、1日が日曜)のマス数は5行×7列=35マスになる", () => {
		const cells = getMonthCalendarCells("2026-02-10");
		expect(cells.length).toBe(35);
		expect(cells.length % 7).toBe(0);
		expect(cells.length / 7).toBeLessThanOrEqual(6);
		// 先頭6マスは前月の空欄(1日が日曜のため、月曜始まりで6マス埋まる)
		for (let i = 0; i < 6; i++) {
			expect(cells[i]).toBeNull();
		}
		expect(cells[6]).toEqual({ date: "2026-02-01" });
		expect(cells[33]).toEqual({ date: "2026-02-28" });
		expect(cells[34]).toBeNull();
	});
});

describe("countEligibleDays", () => {
	it("アカウント作成日より前の日は分母に入らない", () => {
		const period = { start: "2026-09-21", end: "2026-09-27" };
		// アカウント作成日が週の途中(9/24)の場合、9/24〜9/27の4日間だけが対象
		expect(countEligibleDays(period, "2026-09-24", "2026-09-30")).toBe(4);
	});

	it("今日より後の日は分母に入らない", () => {
		const period = { start: "2026-09-21", end: "2026-09-27" };
		// 今日が9/24の場合、9/21〜9/24の4日間だけが対象
		expect(countEligibleDays(period, "2026-01-01", "2026-09-24")).toBe(4);
	});

	it("期間全体が対象になる場合はそのまま日数を返す", () => {
		const period = { start: "2026-09-21", end: "2026-09-27" };
		expect(countEligibleDays(period, "2026-01-01", "2026-12-31")).toBe(7);
	});
});

describe("次へ・今日に戻るの可否", () => {
	it("今日を含む期間では次へは不可、今日に戻るも不要", () => {
		const period = { start: "2026-09-21", end: "2026-09-27" };
		expect(canGoToNextPeriod(period, "2026-09-24")).toBe(false);
		expect(canReturnToToday(period, "2026-09-24")).toBe(false);
	});

	it("今日を含まない期間では次へ・今日に戻るのどちらも可能", () => {
		const period = { start: "2026-09-07", end: "2026-09-13" };
		expect(canGoToNextPeriod(period, "2026-09-24")).toBe(true);
		expect(canReturnToToday(period, "2026-09-24")).toBe(true);
	});
});

describe("移動先の日付", () => {
	it("前へは常に許可される", () => {
		expect(getPreviousPeriodDate("2026-09-24", "week")).toBe("2026-09-17");
		expect(getPreviousPeriodDate("2026-03-31", "month")).toBe("2026-02-28");
	});

	it("次への移動先が今日より後になる場合は今日にする", () => {
		expect(getNextPeriodDate("2026-09-20", "week", "2026-09-24")).toBe("2026-09-24");
	});

	it("次への移動先が今日以前ならそのまま進める", () => {
		expect(getNextPeriodDate("2026-08-01", "week", "2026-09-24")).toBe("2026-08-08");
	});

	it("日タブ(day)は1日ずつ移動する。次への移動先が今日より後になる場合は今日にする", () => {
		expect(getPreviousPeriodDate("2026-09-24", "day")).toBe("2026-09-23");
		expect(getNextPeriodDate("2026-09-24", "day", "2026-09-24")).toBe("2026-09-24");
		expect(getNextPeriodDate("2026-09-23", "day", "2026-09-24")).toBe("2026-09-24");
	});
});

describe("getPeriodRange", () => {
	it("dayはその日1日だけの範囲になる", () => {
		expect(getPeriodRange("2026-09-24", "day")).toEqual({ start: "2026-09-24", end: "2026-09-24" });
	});

	it("week・monthはgetWeekRange・getMonthRangeと同じ結果になる", () => {
		expect(getPeriodRange("2026-09-24", "week")).toEqual(getWeekRange("2026-09-24"));
		expect(getPeriodRange("2026-09-24", "month")).toEqual(getMonthRange("2026-09-24"));
	});
});

describe("期間の表示", () => {
	it("週(同じ年):9/21(月)〜9/27(日)", () => {
		const period = { start: "2026-09-21", end: "2026-09-27" };
		expect(formatWeekPeriodDisplay(period, "2026-09-24")).toBe("9/21(月)〜9/27(日)");
	});

	it("週(年またぎ):年を付けて表示する", () => {
		const period = { start: "2026-12-28", end: "2027-01-03" };
		expect(formatWeekPeriodDisplay(period, "2026-12-30")).toBe(
			"2026/12/28(月)〜2027/1/3(日)",
		);
	});

	it("週(今年以外):今日が別の年なら年を付けて表示する", () => {
		const period = { start: "2025-09-22", end: "2025-09-28" };
		expect(formatWeekPeriodDisplay(period, "2026-09-24")).toBe(
			"2025/9/22(月)〜2025/9/28(日)",
		);
	});

	it("月:2026年9月", () => {
		const period = getMonthRange("2026-09-15");
		expect(formatMonthPeriodDisplay(period)).toBe("2026年9月");
	});
});
