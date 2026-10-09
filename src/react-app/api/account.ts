import { apiClient } from "./client";

// POST /api/account/email/request-change。新しいメールアドレスへ確認コードを送る
// (現在のパスワードの確認、既に使われているメールアドレスの検出はサーバー側で行う)
export function requestEmailChange(newEmail: string, currentPassword: string): Promise<{ success: boolean }> {
	return apiClient.post<{ success: boolean }>("/api/account/email/request-change", {
		newEmail,
		currentPassword,
	});
}

// POST /api/account/withdraw。退会を申請する(即時に論理削除し、30日後に完全に削除する)
export function withdraw(currentPassword: string): Promise<{ success: boolean }> {
	return apiClient.post<{ success: boolean }>("/api/account/withdraw", { currentPassword });
}
