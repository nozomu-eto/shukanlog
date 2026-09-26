import { z } from "zod";

// POST /api/consent のリクエストボディ。現在のPOLICY_VERSIONと一致するかどうかはハンドラ側で確認する
// (「未知のバージョン文字列」自体は形式としては正しいため、zodのスキーマでは文字列であることだけを検証する)
export const consentBodySchema = z.object({
	policyVersion: z.string(),
});
