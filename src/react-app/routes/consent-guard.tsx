import { Navigate, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "../lib/auth-client";
import { getMe } from "../api/me";

// /consentのガード。
// - ログインしていなければ/loginへ
// - 現在の利用規約にすでに同意済みなら/appへ(何度も同意画面を表示しないため)
// 判定中は画面がちらつかないよう何も表示しない
export function ConsentGuard() {
	const { data: session, isPending: isSessionPending } = authClient.useSession();

	const meQuery = useQuery({
		queryKey: ["me"],
		queryFn: getMe,
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
	if (meQuery.isSuccess && meQuery.data.consent.agreed) {
		return <Navigate to="/app" replace />;
	}

	return <Outlet />;
}
