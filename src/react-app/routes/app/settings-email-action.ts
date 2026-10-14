import type { ActionFunctionArgs } from "react-router";
import { requestEmailChange } from "../../api/account";
import { authClient, getAuthErrorCode } from "../../lib/auth-client";
import { toDisplayMessage, ApiError } from "../../api/errors";

// メールアドレス変更の画面の段階と、直近の送信の結果。
// stepは「この結果の後に表示する段階」で、画面はこの値をそのまま使う
// (失敗したときは、今いる段階のまま{ step, error }を返す)
export type EmailChangeResult = { step: "form" | "code" | "done"; error?: string };

// メールアドレス変更のaction。formDataのintentで2つの送信を区別する。
// - request: 新しいメールアドレスへ確認コードを送る(POST /api/account/email/request-change)
// - verify: 確認コードを検証して変更を確定する(Better Authのemail-otp)
export async function settingsEmailAction({ request }: ActionFunctionArgs): Promise<EmailChangeResult> {
	const formData = await request.formData();
	const intent = formData.get("intent");

	if (intent === "request") {
		const newEmail = formData.get("newEmail");
		const currentPassword = formData.get("currentPassword");
		if (typeof newEmail !== "string" || typeof currentPassword !== "string") {
			return { step: "form", error: toDisplayMessage(undefined) };
		}
		try {
			await requestEmailChange(newEmail, currentPassword);
			return { step: "code" };
		} catch (error) {
			if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
				return { step: "form", error: error.message };
			}
			return { step: "form", error: toDisplayMessage(error) };
		}
	}

	if (intent === "verify") {
		const newEmail = formData.get("newEmail");
		const otp = formData.get("otp");
		if (typeof newEmail !== "string" || typeof otp !== "string") {
			return { step: "code", error: "確認コードが正しくありません" };
		}
		const { error } = await authClient.emailOtp.changeEmail({ newEmail, otp });
		if (!error) {
			return { step: "done" };
		}
		if (getAuthErrorCode(error) === "OTP_EXPIRED") {
			return { step: "code", error: "確認コードの有効期限が切れています。もう一度手続きをやり直してください" };
		}
		return { step: "code", error: "確認コードが正しくありません" };
	}

	return { step: "form", error: toDisplayMessage(undefined) };
}
