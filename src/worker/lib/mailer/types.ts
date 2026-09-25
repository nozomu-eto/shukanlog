// 送信するメールの内容
export interface MailMessage {
	to: string;
	subject: string;
	text: string;
	html?: string;
}

// メール送信の実装が満たすべきインターフェース。console/memory/cloudflareの3つを実装する
export interface Mailer {
	send(message: MailMessage): Promise<void>;
}
