// 旧リポジトリ(Amplify版)の lib/domain/date.ts。日付(YYYY-MM-DD形式の文字列)の純粋なユーティリティ。
// 注意: この実装は実行環境のローカル時刻(new Date())を使っている。新リポジトリでは、
// Workers(UTC)でも正しく動くよう「今日」の判定を日本時間(Asia/Tokyo)で明示的に行う形に書き直すこと
// (docs/week-month-tabs.md 1.4)。isValidDateString・shiftDate・formatDateForDisplay の考え方はそのまま使える。

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function toLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 今日の日付をYYYY-MM-DD形式で返す
export function getTodayDateString(): string {
  return formatLocalDate(new Date());
}

// クエリパラメータ等から受け取った文字列が有効なYYYY-MM-DD日付かどうかを検証する
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = toLocalDate(value);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// 指定日からdiffDays日ずらした日付をYYYY-MM-DD形式で返す(前後移動ボタン用)
export function shiftDate(dateString: string, diffDays: number): string {
  const date = toLocalDate(dateString);
  date.setDate(date.getDate() + diffDays);
  return formatLocalDate(date);
}

// 画面表示用の「9月16日(水)」形式に整形する
export function formatDateForDisplay(dateString: string): string {
  const date = toLocalDate(dateString);
  return `${date.getMonth() + 1}月${date.getDate()}日(${WEEKDAY_LABELS[date.getDay()]})`;
}

// 今日より未来の日付かどうかを判定する(YYYY-MM-DD形式同士は文字列比較で大小判定できる)
export function isFutureDate(dateString: string): boolean {
  return dateString > getTodayDateString();
}
