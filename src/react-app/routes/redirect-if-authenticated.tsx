import { Navigate, Outlet } from "react-router";
import { authClient } from "../lib/auth-client";

// ログイン画面・新規登録・確認コード・パスワード再設定(/login, /signup, /verify, /reset, /reset/new)を
// まとめて保護するガード。ログイン済みならそのまま/appへ移動する(これらの画面は未ログイン専用のため)。
// 判定中は画面がちらつかないよう何も表示しない
export function RedirectIfAuthenticated() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return null;
	}
	if (session) {
		return <Navigate to="/app" replace />;
	}
	return <Outlet />;
}
