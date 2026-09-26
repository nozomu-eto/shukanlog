import type { Mailer, MailMessage } from "./types";

// テスト用のメール送信実装。実際には送信せず、送信内容を配列に記録する。
// テストコードから getSentMails() で確認したり、resetSentMails() で初期化したりする
const sentMails: MailMessage[] = [];

export const memoryMailer: Mailer = {
	async send(message) {
		sentMails.push(message);
	},
};

export function getSentMails(): readonly MailMessage[] {
	return sentMails;
}

export function resetSentMails(): void {
	sentMails.length = 0;
}
