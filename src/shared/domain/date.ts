// 日本時間(Asia/Tokyo)基準で日付(YYYY-MM-DD形式の文字列)を扱う純粋関数。
// docs/legacy/date.ts(旧リポジトリ)の考え方を引き継ぎつつ、Workersの実行環境がUTCであっても
// 正しく日本時間の「今日」を判定できるように書き直したもの。
//
// 設計方針:
// - 「現在時刻」はDateオブジェクト(UTCのタイムスタンプを持つ)として引数で受け取り、
//   実行環境のローカル時刻(new Date()のgetFullYear()等)には一切依存しない
// - YYYY-MM-DD文字列自体は「暦の上の日付」であり、時刻・タイムゾームを持たないため、
//   文字列同士の前後移動(前へ・次へ等)はUTC基準のDate.UTCで計算する(実行環境のタイムゾーンに依存させないため)

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// Intl.DateTimeFormatのen-CAロケールは YYYY-MM-DD 形式で日付を返すため、
// タイムゾーン変換だけをIntlに任せてYYYY-MM-DD文字列を得るのに使う
const TOKYO_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

// 任意の時刻(Dateオブジェクト、UTCのタイムスタンプ)を、日本時間での日付(YYYY-MM-DD)に変換する。
// アカウント作成日時(UNIXミリ秒)を日本時間の日付に変換する用途などに使う
export function toTokyoDateString(date: Date): string {
	return TOKYO_DATE_FORMATTER.format(date);
}

// 「今日」の日付(日本時間)を返す。現在時刻はnowで受け取り、テストで固定できるようにする
// (new Date()のローカル時刻を直接使わないこと。既知の落とし穴と同種の問題を避けるため)
export function todayInTokyo(now: Date = new Date()): string {
	return toTokyoDateString(now);
}

// YYYY-MM-DD文字列を、UTC基準の暦日として解釈し、年月日の数値を取り出す
function parseDateParts(dateString: string): { year: number; month: number; day: number } | null {
	if (!DATE_PATTERN.test(dateString)) {
		return null;
	}
	const [year, month, day] = dateString.split("-").map(Number);
	return { year, month, day };
}

// YYYY-MM-DD文字列をUTC基準のDateに変換する(暦日としての計算専用。実際の時刻は持たない)
function toUtcDate(dateString: string): Date {
	const parts = parseDateParts(dateString);
	if (!parts) {
		throw new Error(`不正な日付文字列です: ${dateString}`);
	}
	return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

// UTC基準のDateをYYYY-MM-DD文字列に整形する
function formatUtcDate(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// 文字列が有効なYYYY-MM-DD日付かどうかを検証する(2026-02-30、2026-13-01のような
// 実在しない日付・不正な桁数の月日は無効とする)
export function isValidDateString(value: string): boolean {
	const parts = parseDateParts(value);
	if (!parts) {
		return false;
	}
	const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
	// Dateはオーバーフローした日付(2月30日など)を自動的に繰り上げるため、
	// 変換後の年月日が入力と一致するかで実在する日付かどうかを判定する
	return (
		date.getUTCFullYear() === parts.year &&
		date.getUTCMonth() === parts.month - 1 &&
		date.getUTCDate() === parts.day
	);
}

// 指定日からdiffDays日ずらした日付をYYYY-MM-DD形式で返す(前へ・次へボタンの週移動用)
export function shiftDays(dateString: string, diffDays: number): string {
	const date = toUtcDate(dateString);
	date.setUTCDate(date.getUTCDate() + diffDays);
	return formatUtcDate(date);
}

// 指定日からdiffMonthsか月ずらした日付を返す(前へ・次へボタンの月移動用)。
// 移動先の月に同じ日が無い場合は、その月の末日に丸める(例: 3月31日の1か月前は2月28日、うるう年は29日)
export function shiftMonthsClamped(dateString: string, diffMonths: number): string {
	const parts = parseDateParts(dateString);
	if (!parts) {
		throw new Error(`不正な日付文字列です: ${dateString}`);
	}
	// 一旦「その月の1日」を基準に月をずらし、移動先の月の最終日と比較して丸める
	const firstOfTargetMonth = new Date(Date.UTC(parts.year, parts.month - 1 + diffMonths, 1));
	const lastDayOfTargetMonth = new Date(
		Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth() + 1, 0),
	).getUTCDate();
	const clampedDay = Math.min(parts.day, lastDayOfTargetMonth);
	return formatUtcDate(
		new Date(Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth(), clampedDay)),
	);
}

// dateがtodayより未来の日付かどうかを判定する(YYYY-MM-DD形式同士は文字列比較で大小判定できる)
export function isFuture(date: string, today: string): boolean {
	return date > today;
}

// 画面表示用の「9月25日(金)」形式に整形する
export function formatDateForDisplay(dateString: string): string {
	const parts = parseDateParts(dateString);
	if (!parts) {
		throw new Error(`不正な日付文字列です: ${dateString}`);
	}
	return `${parts.month}月${parts.day}日(${getWeekdayLabel(dateString)})`;
}

// 指定日の曜日を0(日曜)〜6(土曜)の数値で返す
export function getWeekdayIndex(dateString: string): number {
	return toUtcDate(dateString).getUTCDay();
}

// 指定日の曜日を「日」〜「土」の1文字で返す
export function getWeekdayLabel(dateString: string): string {
	return WEEKDAY_LABELS[getWeekdayIndex(dateString)];
}
