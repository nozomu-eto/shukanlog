import { redirect } from "react-router";
import { postConsent } from "../api/me";
import { toDisplayMessage } from "../api/errors";
import { POLICY_VERSION } from "../../shared/policy";

// /consentのaction。利用規約・プライバシーポリシーへの同意を記録する。
// 成功したら/appへ移動する。/appのloaderが/api/meを取り直すため、同意済みとして表示される。
// 失敗した場合は、画面に出す日本語の文言を{ error }で返す
export async function consentAction(): Promise<{ error: string } | undefined> {
	try {
		await postConsent(POLICY_VERSION);
	} catch (error) {
		return { error: toDisplayMessage(error) };
	}
	throw redirect("/app");
}
