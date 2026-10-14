import type { ActionFunctionArgs } from "react-router";
import { patchProfile } from "../../api/profile";

// 設定画面のaction。カロリー記録の有効・無効を切り替える(PATCH /api/profile)。
// 成功したらReact Routerが自動でloaderを取り直すため、/api/meの値(calorieTrackingEnabled)と
// 日・週・月タブの表示が最新になる。結果の文言(トースト)は画面側で決める
export async function settingsAction({ request }: ActionFunctionArgs): Promise<{ ok: boolean }> {
	const formData = await request.formData();
	const value = formData.get("calorieTrackingEnabled");
	if (value !== "true" && value !== "false") {
		return { ok: false };
	}
	try {
		await patchProfile(value === "true");
		return { ok: true };
	} catch {
		return { ok: false };
	}
}
