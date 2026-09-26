import { createCloudflareMailer } from "./cloudflare";
import { consoleMailer } from "./console";
import { memoryMailer } from "./memory";
import type { Mailer } from "./types";

export type { Mailer, MailMessage } from "./types";
export { getSentMails, resetSentMails } from "./memory";

interface MailerEnv {
	readonly BETTER_AUTH_URL: string;
	readonly MAIL_TRANSPORT: string;
	readonly MAIL_FROM_ADDRESS: string;
	readonly MAILER?: SendEmail;
}

// 環境変数 MAIL_TRANSPORT に応じたMailerの実装を返す。
// 安全装置: 本番のURL(https://)で console / memory のメール送信を使おうとした場合は例外を投げる
// (既知の落とし穴4。確認コードが届かず登録できない上、コードがログに平文で残ることを防ぐ)
export function createMailer(env: MailerEnv): Mailer {
	const isProductionUrl = env.BETTER_AUTH_URL.startsWith("https://");

	if (isProductionUrl && (env.MAIL_TRANSPORT === "console" || env.MAIL_TRANSPORT === "memory")) {
		throw new Error(
			`本番のURL(${env.BETTER_AUTH_URL})でMAIL_TRANSPORT="${env.MAIL_TRANSPORT}"は使用できません。MAIL_TRANSPORT="cloudflare"を設定してください。`,
		);
	}

	switch (env.MAIL_TRANSPORT) {
		case "console":
			return consoleMailer;
		case "memory":
			return memoryMailer;
		case "cloudflare":
			return createCloudflareMailer(env);
		default:
			throw new Error(`未対応のMAIL_TRANSPORTです: ${env.MAIL_TRANSPORT}`);
	}
}
