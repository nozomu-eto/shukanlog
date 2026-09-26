import { emailOTP } from "better-auth/plugins";
import type { Mailer } from "../lib/mailer";
import { buildEmailChangeMail, buildEmailVerificationMail, buildPasswordResetMail } from "../lib/mail-templates";

// メールアドレスの確認・パスワード再設定・メールアドレスの変更を、リンクではなく6桁の確認コードで行うプラグイン設定
export function createEmailOTPPlugin(mailer: Mailer) {
	return emailOTP({
		otpLength: 6,
		// 有効期限は10分(秒指定)
		expiresIn: 600,
		// 誤ったコードを試せる回数の上限。超えるとコードが無効になる
		allowedAttempts: 3,
		// メールアドレス確認をリンク方式ではなくOTP(コード)方式に置き換える
		overrideDefaultEmailVerification: true,
		// メールアドレスの変更(/email-otp/request-email-change・/email-otp/change-email)を有効にする。
		// 現在のパスワードの確認は、この機能ではなくsrc/worker/routes/account.tsの
		// POST /api/account/email/request-changeで別途行う(verifyCurrentEmailはOTPによる現メールの
		// 確認用のオプションで、パスワードによる確認とは異なるため使わない)
		changeEmail: {
			enabled: true,
		},
		async sendVerificationOTP({ email, otp, type }) {
			if (type === "email-verification") {
				await mailer.send({ to: email, ...buildEmailVerificationMail(otp) });
				return;
			}
			if (type === "forget-password") {
				await mailer.send({ to: email, ...buildPasswordResetMail(otp) });
				return;
			}
			if (type === "change-email") {
				await mailer.send({ to: email, ...buildEmailChangeMail(otp) });
				return;
			}
			// "sign-in"(パスワード無しのOTPサインイン)は使用しないため何もしない
		},
	});
}
