// 認証メールの件名・本文のテンプレート。文面は docs/legacy/email-templates.md をもとにしている
// (有効期限は現在の仕様に合わせて10分に統一)
interface MailTemplate {
	subject: string;
	text: string;
}

export function buildEmailVerificationMail(code: string): MailTemplate {
	return {
		subject: "【shukanlog】メールアドレス確認コード",
		text: `shukanlogにご登録いただきありがとうございます。
以下の確認コードを画面に入力し、登録を完了してください。

確認コード: ${code}
有効期限: 10分

このメールに心当たりがない場合は、このメールを破棄してください。
`,
	};
}

export function buildEmailChangeMail(code: string): MailTemplate {
	return {
		subject: "【shukanlog】メールアドレス変更の確認コード",
		text: `メールアドレスの変更手続きのため、確認コードが必要です。
以下の確認コードを画面に入力してください。

確認コード: ${code}
有効期限: 10分

このメールに心当たりがない場合は、このメールを破棄してください。
`,
	};
}

export function buildPasswordResetMail(code: string): MailTemplate {
	return {
		subject: "【shukanlog】パスワード再設定コード",
		text: `パスワード再設定のリクエストを受け付けました。
以下の確認コードを画面に入力し、新しいパスワードを設定してください。

確認コード: ${code}
有効期限: 10分

このメールに心当たりがない場合は、パスワードは変更されませんので、
このメールを破棄してください。
`,
	};
}
