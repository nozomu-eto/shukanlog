import { ApiError } from "./client";

// エラーコードごとの、サーバー側のmessageが無い場合に使う日本語の文言の既定値
const FALLBACK_MESSAGES: Record<string, string> = {
	VALIDATION_ERROR: "入力内容をご確認ください。",
	UNAUTHORIZED: "ログインが必要です。もう一度ログインしてください。",
	CONSENT_REQUIRED: "利用規約への同意が必要です。",
	CALORIE_TRACKING_DISABLED: "カロリー記録が無効になっています。",
	NOT_FOUND: "対象のデータが見つかりませんでした。",
	RATE_LIMITED: "しばらく時間をおいてから、もう一度お試しください。",
	NETWORK_ERROR: "通信状況を確認して、もう一度お試しください。",
	INTERNAL_ERROR: "予期しないエラーが発生しました。もう一度お試しください。",
};

// APIのエラーレスポンス({ error: { code, message } })を、画面に表示する日本語の文言に変換する。
// サーバーのmessageは基本的にすでに利用者向けの日本語文なのでそのまま使い、
// 万一空文字列などだった場合にコードごとの既定文言にfalback する
export function toDisplayMessage(error: unknown): string {
	if (error instanceof ApiError) {
		return error.message || FALLBACK_MESSAGES[error.code] || FALLBACK_MESSAGES.INTERNAL_ERROR;
	}
	return FALLBACK_MESSAGES.INTERNAL_ERROR;
}

export { ApiError };
