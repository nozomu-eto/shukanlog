import { apiClient } from "./client";

// POST /api/account/email/request-change。新しいメールアドレスへ確認コードを送る
// (現在のパスワードの確認、既に使われているメールアドレスの検出はサーバー側で行う)
export function requestEmailChange(newEmail: string, currentPassword: string): Promise<{ success: boolean }> {
	return apiClient.post<{ success: boolean }>("/api/account/email/request-change", {
		newEmail,
		currentPassword,
	});
}
