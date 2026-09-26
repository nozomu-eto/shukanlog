import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";

type AuthState = "loading" | "authenticated" | "unauthenticated";

// /app配下のページをまとめて保護するガード。ログインしていなければ/loginへ移動する。
// 利用規約への同意状況による振り分けはステップ3で追加する
export function RequireAuth() {
	const [authState, setAuthState] = useState<AuthState>("loading");

	useEffect(() => {
		let cancelled = false;

		fetch("/api/auth/get-session")
			.then((res) => (res.ok ? res.json() : null))
			.then((session) => {
				if (cancelled) return;
				setAuthState(session ? "authenticated" : "unauthenticated");
			})
			.catch(() => {
				if (cancelled) return;
				setAuthState("unauthenticated");
			});

		return () => {
			cancelled = true;
		};
	}, []);

	if (authState === "loading") {
		return null;
	}

	if (authState === "unauthenticated") {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
}
