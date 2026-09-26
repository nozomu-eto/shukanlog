import type { Mailer } from "./types";

// 開発用のメール送信実装。実際には送信せず、内容を標準出力に表示するだけ。
// 本番URL(https://)では使用できない(createMailerの安全装置で例外を投げる)
export const consoleMailer: Mailer = {
	async send(message) {
		console.log("[mailer:console] メールを送信しました(実際には送信していません)");
		console.log(`宛先: ${message.to}`);
		console.log(`件名: ${message.subject}`);
		console.log(message.text);
	},
};
