// 週タブ・月タブで使う「期間」の計算を行う純粋関数。docs/week-month-tabs.md の1章・4章を実装したもの。
// 日付はすべてsrc/shared/domain/date.tsと同じくYYYY-MM-DD形式の文字列(日本時間の暦日)で扱う

import { getWeekdayIndex, isFuture, shiftDays, shiftMonthsClamped } from "./date";

export type DateRange = { start: string; end: string };

// 期間の単位(日タブ・週タブ・月タブ)。日タブは start === end の1日だけの期間として扱う
export type PeriodUnit = "day" | "week" | "month";

// YYYY-MM-DD文字列から年・月・日を取り出す(period.ts内の計算用の簡易ヘルパー)
function parseYearMonthDay(dateString: string): { year: number; month: number; day: number } {
	const [year, month, day] = dateString.split("-").map(Number);
	return { year, month, day };
}

// 指定日を含む週(月曜〜日曜)の範囲を返す
export function getWeekRange(dateString: string): DateRange {
	// getWeekdayIndexは0(日)〜6(土)を返す。月曜(1)からの差分でその週の月曜までさかのぼる
	const weekdayIndex = getWeekdayIndex(dateString);
	const diffToMonday = weekdayIndex === 0 ? -6 : 1 - weekdayIndex;
	const start = shiftDays(dateString, diffToMonday);
	const end = shiftDays(start, 6);
	return { start, end };
}

// 指定日を含む月の範囲(月初〜月末)を返す
export function getMonthRange(dateString: string): DateRange {
	const { year, month } = parseYearMonthDay(dateString);
	const start = `${year}-${String(month).padStart(2, "0")}-01`;
	const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
	return { start, end };
}

// 月タブのカレンダーの1マス。前月・翌月にあたる空欄のマスはnullで表す
export type MonthCalendarCell = { date: string } | null;

// 指定日を含む月のカレンダーのマス(月曜始まり)を返す。
// 前月・翌月の日付は空欄(null)にし、最後の週の行を埋めるためのマスも含める
export function getMonthCalendarCells(dateString: string): MonthCalendarCell[] {
	const { start, end } = getMonthRange(dateString);
	const firstWeekdayIndex = getWeekdayIndex(start); // 0(日)〜6(土)
	// 月曜始まりの列における、月初日が何列目に来るか(月曜=0列目)
	const leadingBlankCount = firstWeekdayIndex === 0 ? 6 : firstWeekdayIndex - 1;

	const cells: MonthCalendarCell[] = [];
	for (let i = 0; i < leadingBlankCount; i++) {
		cells.push(null);
	}

	let current = start;
	while (current <= end) {
		cells.push({ date: current });
		current = shiftDays(current, 1);
	}

	// 最後の週の行を7列に揃えるための空欄を追加する
	const trailingBlankCount = (7 - (cells.length % 7)) % 7;
	for (let i = 0; i < trailingBlankCount; i++) {
		cells.push(null);
	}

	return cells;
}

// 2つの日付の間の日数(両端を含む)を返す。範囲が逆転している(fromの方が後)場合は0を返す
function countDaysInclusive(from: string, to: string): number {
	if (from > to) {
		return 0;
	}
	const { year: fy, month: fm, day: fd } = parseYearMonthDay(from);
	const { year: ty, month: tm, day: td } = parseYearMonthDay(to);
	const fromUtc = Date.UTC(fy, fm - 1, fd);
	const toUtc = Date.UTC(ty, tm - 1, td);
	return Math.round((toUtc - fromUtc) / (24 * 60 * 60 * 1000)) + 1;
}

// 集計の分母(期間内で「アカウント作成日以降」かつ「今日以前」の日数)を計算する
export function countEligibleDays(
	period: DateRange,
	accountCreatedDate: string,
	today: string,
): number {
	const effectiveStart = period.start > accountCreatedDate ? period.start : accountCreatedDate;
	const effectiveEnd = period.end < today ? period.end : today;
	return countDaysInclusive(effectiveStart, effectiveEnd);
}

// todayが期間(period)に含まれているかどうかを判定する
export function isTodayWithinPeriod(period: DateRange, today: string): boolean {
	return today >= period.start && today <= period.end;
}

// 「次へ」ボタンを押せるかどうか(今日を含む期間を表示しているときは押せない)
export function canGoToNextPeriod(period: DateRange, today: string): boolean {
	return !isTodayWithinPeriod(period, today);
}

// 「今日に戻る」ボタンを表示するかどうか(今日を含まない期間を表示しているときだけ表示する)
export function canReturnToToday(period: DateRange, today: string): boolean {
	return !isTodayWithinPeriod(period, today);
}

// 「前へ」ボタンを押したときの移動先の日付(常に押せる。移動先の上限は無い)
export function getPreviousPeriodDate(dateString: string, unit: PeriodUnit): string {
	if (unit === "day") {
		return shiftDays(dateString, -1);
	}
	return unit === "week" ? shiftDays(dateString, -7) : shiftMonthsClamped(dateString, -1);
}

// 「次へ」ボタンを押したときの移動先の日付。移動先が今日より後になる場合は今日にする
export function getNextPeriodDate(dateString: string, unit: PeriodUnit, today: string): string {
	const next = unit === "day" ? shiftDays(dateString, 1) : unit === "week" ? shiftDays(dateString, 7) : shiftMonthsClamped(dateString, 1);
	return isFuture(next, today) ? today : next;
}

// 指定日を含む「期間」の範囲を返す(日タブはその日1日だけの範囲として扱う)
export function getPeriodRange(dateString: string, unit: PeriodUnit): DateRange {
	if (unit === "day") {
		return { start: dateString, end: dateString };
	}
	return unit === "week" ? getWeekRange(dateString) : getMonthRange(dateString);
}

// 週タブの期間表示(例: 9/21(月)〜9/27(日)、年をまたぐ・今年以外の場合は年も表示する)
export function formatWeekPeriodDisplay(period: DateRange, today: string): string {
	const startParts = parseYearMonthDay(period.start);
	const endParts = parseYearMonthDay(period.end);
	const todayParts = parseYearMonthDay(today);

	const startWeekday = ["日", "月", "火", "水", "木", "金", "土"][getWeekdayIndex(period.start)];
	const endWeekday = ["日", "月", "火", "水", "木", "金", "土"][getWeekdayIndex(period.end)];

	// 週が年をまたぐ場合、または今年以外の週の場合は年も表示する
	const showYear = startParts.year !== endParts.year || startParts.year !== todayParts.year;

	const startLabel = showYear
		? `${startParts.year}/${startParts.month}/${startParts.day}(${startWeekday})`
		: `${startParts.month}/${startParts.day}(${startWeekday})`;
	const endLabel = showYear
		? `${endParts.year}/${endParts.month}/${endParts.day}(${endWeekday})`
		: `${endParts.month}/${endParts.day}(${endWeekday})`;

	return `${startLabel}〜${endLabel}`;
}

// 月タブの期間表示(例: 2026年9月)
export function formatMonthPeriodDisplay(period: DateRange): string {
	const { year, month } = parseYearMonthDay(period.start);
	return `${year}年${month}月`;
}
