import { redirect, useRouteLoaderData, type ShouldRevalidateFunctionArgs } from "react-router";
import { authClient } from "../../lib/auth-client";
import { ApiError } from "../../api/client";
import { getMe, type MeResponse } from "../../api/me";

// /app親ルートのid。子ルートがuseRouteLoaderDataで親のloaderの結果を取り出すときに使う
export const APP_ROUTE_ID = "app";

// 今のログイン状態と自分の情報(GET /api/me)を取得する。未ログインならnullを返す。
// loaderの中ではReactのフック(authClient.useSession)を使えないため、authClient.getSession()を使う。
// getSession()は{ data, error }を返し、未ログインのときはサーバーが200でnullを返すので
// data===nullかつerror===nullになる(better-authのget-sessionの実装で確認)。
// error有りは通信失敗などなので、未ログイン扱いにせず例外にしてerrorElementの「再読み込み」に任せる
async function loadMe(): Promise<MeResponse | null> {
	const { data: session, error } = await authClient.getSession();
	if (error) {
		throw new Error("ログイン状態を確認できませんでした");
	}
	if (!session) {
		return null;
	}
	try {
		return await getMe();
	} catch (e) {
		// セッションの確認後に期限が切れた場合は未ログイン扱いにする
		if (e instanceof ApiError && e.status === 401) {
			return null;
		}
		throw e;
	}
}

// /app配下のloader。ログイン・同意の状態による振り分けをここで行う(旧RequireAuthの役割)。
// - 未ログインなら/loginへ
// - 現在の利用規約に未同意なら/consentへ
// 返したMeResponseは、子ルートがuseAppMe()で受け取る
export async function appLoader(): Promise<MeResponse> {
	const me = await loadMe();
	if (!me) {
		throw redirect("/login");
	}
	if (!me.consent.agreed) {
		throw redirect("/consent");
	}
	return me;
}

// /consentのloader。ログインしていなければ/loginへ、すでに同意済みなら/appへ振り分ける(旧ConsentGuardの役割)。
// 同意画面自体では結果を使わないが、未同意の場合にそのまま表示するため値を返す
export async function consentLoader(): Promise<MeResponse> {
	const me = await loadMe();
	if (!me) {
		throw redirect("/login");
	}
	if (me.consent.agreed) {
		throw redirect("/app");
	}
	return me;
}

// 親(/app)のloaderを再実行しない条件。次の2つのときだけfalseを返す。
// 1. 送信(action)を伴わず、同じパスのままsearch params(tab・date)だけが変わるとき。
//    日・週・月タブの切り替えや日付の移動のたびに/api/meを取り直さないため。
//    search paramsが同じ(useRevalidatorによる再読み込みなど)ときは、再取得が必要なのでfalseにしない
// 2. 習慣の記録の保存(/appのindexルートのaction。日タブの◯△×)のとき。
//    保存しても/api/meの内容(メール・プロフィール・同意状況など)は変わらず、
//    押すたびに/api/meを取り直すのは無駄なため。設定やメール変更などの他のactionの後は、必ず取り直す
// それ以外(上記以外のaction後・別パスへの移動・再読み込み)はReact Routerの既定の判定に従う
export function appShouldRevalidate({
	currentUrl,
	nextUrl,
	formMethod,
	formAction,
	defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
	const isSubmission = formMethod !== undefined;
	const isSearchOnlyChange = currentUrl.pathname === nextUrl.pathname && currentUrl.search !== nextUrl.search;
	if (!isSubmission && isSearchOnlyChange) {
		return false;
	}
	const isHabitLogSave = isSubmission && formAction !== undefined && new URL(formAction, currentUrl).pathname === "/app";
	if (isHabitLogSave) {
		return false;
	}
	return defaultShouldRevalidate;
}

// 子ルートが、/app親ルートのloaderで取得済みの自分の情報を取り出す
export function useAppMe(): MeResponse {
	const me = useRouteLoaderData<typeof appLoader>(APP_ROUTE_ID);
	if (!me) {
		throw new Error("useAppMeは/app配下のルートで使ってください");
	}
	return me;
}
