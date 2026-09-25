import type { Context } from "hono";

// 静的ファイル(SPA本体)をASSETSバインディング経由で取得するハンドラ。
// ASSETSから返されたレスポンスはヘッダーを直接変更できないため、複製してから使う(既知の落とし穴3)
export async function serveAssets(c: Context<{ Bindings: Env }>) {
	const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
	const response = new Response(assetResponse.body, assetResponse);

	// ビルドで出力されるハッシュ付きファイル(/assets/*)は長期間キャッシュしてよい
	if (new URL(c.req.url).pathname.startsWith("/assets/")) {
		response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
	}

	return response;
}
