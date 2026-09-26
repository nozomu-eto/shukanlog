import { describe, expect, it } from "vitest";
import {
	formatDateForDisplay,
	getWeekdayIndex,
	getWeekdayLabel,
	isFuture,
	isValidDateString,
	shiftDays,
	shiftMonthsClamped,
	todayInTokyo,
	toTokyoDateString,
} from "../../../../src/shared/domain/date";

describe("todayInTokyo / toTokyoDateString", () => {
	it("UTCの日付が変わっても日本時間ではまだ同じ日のことがある(日本時間の方が9時間進んでいる)", () => {
		// UTCで2026-09-24 15:30 は 日本時間で 2026-09-25 00:30
		const now = new Date("2026-09-24T15:30:00Z");
		expect(todayInTokyo(now)).toBe("2026-09-25");
		expect(toTokyoDateString(now)).toBe("2026-09-25");
	});

	it("UTCの日付とまだ日本時間の日付が同じ時刻もある", () => {
		// UTCで2026-09-24 10:00 は 日本時間で 2026-09-24 19:00
		const now = new Date("2026-09-24T10:00:00Z");
		expect(todayInTokyo(now)).toBe("2026-09-24");
	});
});

describe("isValidDateString", () => {
	it("正しい日付形式を有効と判定する", () => {
		expect(isValidDateString("2026-09-25")).toBe(true);
	});

	it("うるう年の2月29日を有効と判定する", () => {
		expect(isValidDateString("2028-02-29")).toBe(true);
	});

	it("うるう年でない年の2月29日を無効と判定する", () => {
		expect(isValidDateString("2026-02-29")).toBe(false);
	});

	it("存在しない日付(2026-02-30)を無効と判定する", () => {
		expect(isValidDateString("2026-02-30")).toBe(false);
	});

	it("存在しない月(2026-13-01)を無効と判定する", () => {
		expect(isValidDateString("2026-13-01")).toBe(false);
	});

	it("形式が違う文字列を無効と判定する", () => {
		expect(isValidDateString("2026/09/25")).toBe(false);
		expect(isValidDateString("not-a-date")).toBe(false);
	});
});

describe("shiftDays", () => {
	it("日をまたいで前後にずらせる", () => {
		expect(shiftDays("2026-09-25", 7)).toBe("2026-10-02");
		expect(shiftDays("2026-09-25", -7)).toBe("2026-09-18");
	});

	it("年をまたいでずらせる", () => {
		expect(shiftDays("2026-12-30", 5)).toBe("2027-01-04");
	});
});

describe("shiftMonthsClamped", () => {
	it("同じ日が翌月にもあればそのままずらす", () => {
		expect(shiftMonthsClamped("2026-01-15", 1)).toBe("2026-02-15");
	});

	it("3月31日の1か月前は2月28日に丸める(平年)", () => {
		expect(shiftMonthsClamped("2026-03-31", -1)).toBe("2026-02-28");
	});

	it("3月31日の1か月前はうるう年なら2月29日に丸める", () => {
		expect(shiftMonthsClamped("2028-03-31", -1)).toBe("2028-02-29");
	});

	it("年をまたいだ月の移動もできる", () => {
		expect(shiftMonthsClamped("2026-01-31", -1)).toBe("2025-12-31");
	});
});

describe("isFuture", () => {
	it("todayより後の日付をtrueと判定する", () => {
		expect(isFuture("2026-09-26", "2026-09-25")).toBe(true);
	});

	it("today以前の日付をfalseと判定する", () => {
		expect(isFuture("2026-09-25", "2026-09-25")).toBe(false);
		expect(isFuture("2026-09-24", "2026-09-25")).toBe(false);
	});
});

describe("formatDateForDisplay", () => {
	it("9月25日(金)の形式に整形する", () => {
		expect(formatDateForDisplay("2026-09-25")).toBe("9月25日(金)");
	});
});

describe("曜日の取得", () => {
	it("getWeekdayIndexは0(日)〜6(土)を返す", () => {
		expect(getWeekdayIndex("2026-09-27")).toBe(0); // 日曜
		expect(getWeekdayIndex("2026-09-21")).toBe(1); // 月曜
	});

	it("getWeekdayLabelは1文字の曜日を返す", () => {
		expect(getWeekdayLabel("2026-09-21")).toBe("月");
		expect(getWeekdayLabel("2026-09-27")).toBe("日");
	});
});
