// 認証まわりの画面(ログイン・新規登録・パスワード再設定)で共通に使う、入力チェックの純粋関数。
// サーバー側の検証と重複するが、送信前に画面側でも同じ条件を確認し、
// 通信を待たずにエラーを表示できるようにする

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
