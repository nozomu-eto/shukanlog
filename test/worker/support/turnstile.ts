import { vi } from "vitest";

// テストから新規登録(Turnstile必須)を呼ぶ際に、siteverifyの結果をモックするためのヘルパー
export function stubTurnstileSiteverify(success: boolean) {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = typeof input === "string" ? input : input.toString();
			if (url.startsWith("https://challenges.cloudflare.com/turnstile/v0/siteverify")) {
				return new Response(JSON.stringify({ success }), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			}
			return fetch(input, init);
		}),
	);
}
