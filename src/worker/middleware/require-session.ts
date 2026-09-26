import type { MiddlewareHandler } from "hono";
import { createAuth } from "../auth";
import { toTokyoDateString } from "../../shared/domain/date";
import type { AppEnv } from "../types";

// Better Authのセッションを確認する認証必須APIの共通ミドルウェア。
// セッションが無ければ401を返す。あれば、利用者IDとアカウント作成日(日本時間)を
// コンテキストに入れ、以降のミドルウェア・ハンドラから参照できるようにする
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
	const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
	if (!session) {
		return c.json({ error: { code: "UNAUTHORIZED", message: "ログインが必要です" } }, 401);
	}

	c.set("userId", session.user.id);
	// user.createdAtはBetter Auth側でDateとして返るが、念のためnew Date()で正規化してから変換する
	c.set("accountCreatedDate", toTokyoDateString(new Date(session.user.createdAt)));

	await next();
};
