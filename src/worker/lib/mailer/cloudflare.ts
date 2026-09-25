import type { Mailer } from "./types";

interface CloudflareMailerEnv {
	readonly MAILER?: SendEmail;
	readonly MAIL_FROM_ADDRESS: string;
}

// 本番用のメール送信実装。Cloudflare Email Sending の send_email バインディングを使う。
// 確認コードやメール本文はログに出力しない(既知の落とし穴4)
export function createCloudflareMailer(env: CloudflareMailerEnv): Mailer {
	return {
		async send(message) {
			if (!env.MAILER) {
				throw new Error("MAILERバインディングが設定されていません");
			}
			await env.MAILER.send({
				from: env.MAIL_FROM_ADDRESS,
				to: message.to,
				subject: message.subject,
				text: message.text,
				html: message.html,
			});
		},
	};
}
