// 認証まわりの画面(ログイン・新規登録・パスワード再設定)・カロリーの記録で共通に使う、入力チェックの純粋関数。
// サーバー側の検証と重複するが、送信前に画面側でも同じ条件を確認し、
// 通信を待たずにエラーを表示できるようにする
import { CALORIE_MAX, CALORIE_MIN, CALORIE_NOTE_MAX_LENGTH } from "../../shared/limits";

// メールアドレスの入力チェック。空・"@"を含まない場合はエラー文言を返す
export function validateEmail(value: string): string | undefined {
	if (!value) {
		return "メールアドレスを入力してください";
	}
	if (!value.includes("@") || value.indexOf("@") < 1) {
		return "メールアドレスの形式が正しくありません";
	}
	return undefined;
}

// パスワードの入力チェック(ログイン用。空でなければよい)
export function validatePasswordRequired(value: string): string | undefined {
	if (!value) {
		return "パスワードを入力してください";
	}
	return undefined;
}

// 新しいパスワードの入力チェック(新規登録・パスワード再設定用。8文字以上)
export function validateNewPassword(value: string): string | undefined {
	if (!value) {
		return "パスワードを入力してください";
	}
	if (value.length < 8) {
		return "8文字以上で入力してください";
	}
	return undefined;
}

// 確認コード(6桁の数字)の入力チェック
export function validateOtp(value: string): string | undefined {
	if (!/^[0-9]{6}$/.test(value)) {
		return "6桁の数字を入力してください";
	}
	return undefined;
}

// カロリーの入力チェック(0〜10000の整数のみ。小数・空文字はエラー)
export function validateCalorieAmount(value: string): string | undefined {
	if (value === "") {
		return "カロリーを入力してください";
	}
	if (!/^[0-9]+$/.test(value) || Number(value) > CALORIE_MAX || Number(value) < CALORIE_MIN) {
		return `${CALORIE_MIN}〜${CALORIE_MAX}の整数で入力してください`;
	}
	return undefined;
}

// カロリーのメモの入力チェック(任意。500文字まで)
export function validateCalorieNote(value: string): string | undefined {
	if (value.length > CALORIE_NOTE_MAX_LENGTH) {
		return `${CALORIE_NOTE_MAX_LENGTH}文字以内で入力してください`;
	}
	return undefined;
}
