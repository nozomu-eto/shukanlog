// 確認コード入力・パスワード再設定の画面へ、メールアドレスを画面間で受け渡すための仕組み。
// 個人情報をURLのクエリに含めないため、react-routerのstateに加えて、
// 直接そのURLを開いた場合(リロード等)のためsessionStorageにも保存しておく
const STORAGE_KEY = "shukanlog:pendingEmail";

export function setPendingEmail(email: string): void {
	sessionStorage.setItem(STORAGE_KEY, email);
}

export function getPendingEmail(): string | null {
	return sessionStorage.getItem(STORAGE_KEY);
}

export function clearPendingEmail(): void {
	sessionStorage.removeItem(STORAGE_KEY);
}
