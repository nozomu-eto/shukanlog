import { describe, expect, it } from "vitest";
import { verifyTurnstileToken } from "../../src/worker/lib/turnstile";

function fakeFetch(success: boolean): typeof fetch {
	return (async () =>
		new Response(JSON.stringify({ success }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
}

describe("verifyTurnstileToken", () => {
	it("siteverifyがsuccess:trueを返す場合はtrueを返す", async () => {
		const result = await verifyTurnstileToken({
			token: "dummy-token",
			secretKey: "dummy-secret",
			fetchImpl: fakeFetch(true),
		});
		expect(result).toBe(true);
	});

	it("siteverifyがsuccess:falseを返す場合はfalseを返す", async () => {
		const result = await verifyTurnstileToken({
			token: "dummy-token",
			secretKey: "dummy-secret",
			fetchImpl: fakeFetch(false),
		});
		expect(result).toBe(false);
	});
});
