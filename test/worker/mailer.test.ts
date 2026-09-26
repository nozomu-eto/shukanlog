import { beforeEach, describe, expect, it } from "vitest";
import { createMailer, getSentMails, resetSentMails } from "../../src/worker/lib/mailer";

describe("createMailer", () => {
	beforeEach(() => {
		resetSentMails();
	});

	it("本番URL(https://)でMAIL_TRANSPORT=consoleの場合は例外を投げる", () => {
		expect(() =>
			createMailer({
				BETTER_AUTH_URL: "https://shukanlog.com",
				MAIL_TRANSPORT: "console",
				MAIL_FROM_ADDRESS: "noreply@shukanlog.com",
			}),
		).toThrow();
	});

	it("本番URL(https://)でMAIL_TRANSPORT=memoryの場合は例外を投げる", () => {
		expect(() =>
			createMailer({
				BETTER_AUTH_URL: "https://shukanlog.com",
				MAIL_TRANSPORT: "memory",
				MAIL_FROM_ADDRESS: "noreply@shukanlog.com",
			}),
		).toThrow();
	});

	it("開発URL(http://)ではMAIL_TRANSPORT=consoleを使用できる", () => {
		expect(() =>
			createMailer({
				BETTER_AUTH_URL: "http://localhost:5173",
				MAIL_TRANSPORT: "console",
				MAIL_FROM_ADDRESS: "noreply@example.com",
			}),
		).not.toThrow();
	});

	it("memory実装が送信内容を記録する", async () => {
		const mailer = createMailer({
			BETTER_AUTH_URL: "http://localhost:5173",
			MAIL_TRANSPORT: "memory",
			MAIL_FROM_ADDRESS: "noreply@example.com",
		});

		await mailer.send({ to: "user@example.com", subject: "件名", text: "本文" });

		const sentMails = getSentMails();
		expect(sentMails).toHaveLength(1);
		expect(sentMails[0]).toEqual({ to: "user@example.com", subject: "件名", text: "本文" });
	});
});
