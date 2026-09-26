import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError } from "../../../src/react-app/api/client";
import { toDisplayMessage } from "../../../src/react-app/api/errors";

describe("apiClient", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("エラーレスポンス({ error: { code, message } })をApiErrorに変換する", async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "入力内容を確認してください" } }), {
					status: 400,
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(apiClient.get("/api/days/2026-09-25")).rejects.toMatchObject({
			code: "VALIDATION_ERROR",
			message: "入力内容を確認してください",
			status: 400,
		});
	});

	it("204(本文なし)は例外を投げず、undefinedを返す", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(null, { status: 204 })),
		);
		await expect(apiClient.delete("/api/calorie-logs/1")).resolves.toBeUndefined();
	});

	it("成功時はJSONの本文をそのまま返す", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 })),
		);
		await expect(apiClient.get("/api/health")).resolves.toEqual({ status: "ok" });
	});

	it("fetch自体が失敗した場合(オフライン等)はNETWORK_ERRORのApiErrorになる", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("Failed to fetch");
			}),
		);
		await expect(apiClient.get("/api/health")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
	});
});

describe("toDisplayMessage", () => {
	it("ApiErrorのmessageをそのまま表示文言として使う", () => {
		const error = new ApiError("NOT_FOUND", "指定のデータが見つかりません", 404);
		expect(toDisplayMessage(error)).toBe("指定のデータが見つかりません");
	});

	it("messageが空の場合はコードごとの既定文言にfallbackする", () => {
		const error = new ApiError("RATE_LIMITED", "", 429);
		expect(toDisplayMessage(error)).toBe("しばらく時間をおいてから、もう一度お試しください。");
	});

	it("ApiError以外の例外(想定外のエラー)は共通の文言にする", () => {
		expect(toDisplayMessage(new Error("何か別のエラー"))).toBe(
			"予期しないエラーが発生しました。もう一度お試しください。",
		);
	});
});
