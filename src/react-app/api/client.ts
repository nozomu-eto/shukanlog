// APIの共通のエラーレスポンスの形。docs/api.md参照
interface ApiErrorBody {
	error?: { code?: string; message?: string };
}

// API呼び出しの失敗を表す例外。エラーコード(VALIDATION_ERROR等)を持ち、
// 画面側でtoDisplayMessage()を使って利用者向けの文言に変換する
export class ApiError extends Error {
	readonly code: string;
	readonly status: number;

	constructor(code: string, message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.status = status;
	}
}

type JsonBody = Record<string, unknown> | unknown[];

interface RequestOptions {
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: JsonBody;
}

// fetchの共通処理。credentials(Cookie)を必ず送り、JSONの組み立て・解析、
// エラーレスポンス({ error: { code, message } })をApiErrorに変換する処理をここに集約する
async function request<T>(path: string, { method, body }: RequestOptions): Promise<T> {
	let res: Response;
	try {
		res = await fetch(path, {
			method,
			credentials: "include",
			headers: body !== undefined ? { "content-type": "application/json" } : undefined,
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
	} catch {
		// fetch自体が失敗する(オフライン等)場合も、通信エラーとして同じApiErrorに揃える
		throw new ApiError("NETWORK_ERROR", "通信状況を確認して、もう一度お試しください", 0);
	}

	// 204 No Content(DELETEの成功時など)は本文を読まない
	if (res.status === 204) {
		return undefined as T;
	}

	const text = await res.text();
	const data = text.length > 0 ? (JSON.parse(text) as unknown) : undefined;

	if (!res.ok) {
		const errorBody = data as ApiErrorBody | undefined;
		throw new ApiError(
			errorBody?.error?.code ?? "INTERNAL_ERROR",
			errorBody?.error?.message ?? "エラーが発生しました",
			res.status,
		);
	}

	return data as T;
}

// docs/api.mdの各APIから呼び出す、メソッドごとの薄いラッパー
export const apiClient = {
	get: <T>(path: string) => request<T>(path, { method: "GET" }),
	post: <T>(path: string, body?: JsonBody) => request<T>(path, { method: "POST", body }),
	put: <T>(path: string, body?: JsonBody) => request<T>(path, { method: "PUT", body }),
	patch: <T>(path: string, body?: JsonBody) => request<T>(path, { method: "PATCH", body }),
	delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
