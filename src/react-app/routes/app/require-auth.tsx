import { Navigate, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "../../lib/auth-client";
import { getMe } from "../../api/me";

// /app配下のページをまとめて保護するガード。
// - ログインしていなければ/loginへ
// - ログイン済みでも、現在の利用規約に未同意なら/consentへ(GET /api/meのconsent.agreedを見る)
// 判定中(セッション確認・GET /api/me取得のどちらか)は、画面がちらつかないよう何も表示しない
export function RequireAuth() {
	const { data: session, isPending: isSessionPending } = authClient.useSession();

	const meQuery = useQuery({
		queryKey: ["me"],
		queryFn: getMe,
		// セッションが確認できてから呼ぶ(未ログインの状態でGET /api/meを呼んでも401になるだけのため)
		enabled: !!session,
	});

	if (isSessionPending) {
		return null;
	}
	if (!session) {
		return <Navigate to="/login" replace />;
	}
	if (meQuery.isPending) {
		return null;
	}
	if (meQuery.isSuccess && !meQuery.data.consent.agreed) {
		return <Navigate to="/consent" replace />;
	}

	return <Outlet />;
}
