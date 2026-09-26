import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";

// リクエストボディ等の検証にzodを使い、検証エラーは統一の形式(400、code: "VALIDATION_ERROR")で返す。
// エラーレスポンスの形は { error: { code, message } } に統一する(内部のエラー内容は返さない)
export function validate<T extends ZodType, Target extends keyof ValidationTargets>(
	target: Target,
	schema: T,
) {
	return zValidator(target, schema, (result, c) => {
		if (!result.success) {
			return c.json(
				{ error: { code: "VALIDATION_ERROR", message: "入力内容を確認してください" } },
				400,
			);
		}
	});
}
