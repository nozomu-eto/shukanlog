import { emailOTP } from "better-auth/plugins";
import type { Mailer } from "../lib/mailer";
import { buildEmailVerificationMail, buildPasswordResetMail } from "../lib/mail-templates";

// メールアドレスの確認・パスワード再設定を、リンクではなく6桁の確認コードで行うプラグイン設定
export function createEmailOTPPlugin(mailer: Mailer) {
	return emailOTP({
		otpLength: 6,
		// 有効期限は10分(秒指定)
		expiresIn: 600,
		// 誤ったコードを試せる回数の上限。超えるとコードが無効になる
		allowedAttempts: 3,
		// メールアドレス確認をリンク方式ではなくOTP(コード)方式に置き換える
		overrideDefaultEmailVerification: true,
		async sendVerificationOTP({ email, otp, type }) {
			if (type === "email-verification") {
				await mailer.send({ to: email, ...buildEmailVerificationMail(otp) });
				return;
			}
			if (type === "forget-password") {
				await mailer.send({ to: email, ...buildPasswordResetMail(otp) });
				return;
			}
			// "sign-in"(パスワード無しのOTPサインイン)は使用しないため何もしない
		},
	});
}
