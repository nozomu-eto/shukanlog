import { useNavigate } from "react-router";
import { authClient } from "../../lib/auth-client";
import { Button } from "../../components/Button";

// 設定画面。中身はステップ4で作る。
// 動作確認のため、ログアウトのボタンだけ仮に置いている(ログアウト後は/loginへ「ログアウトしました」を伝える)
export function SettingsRoute() {
	const navigate = useNavigate();

	async function handleLogout() {
		await authClient.signOut();
		navigate("/login", { state: { message: "ログアウトしました" }, replace: true });
	}

	return (
		<div>
			<h1>設定</h1>
			<Button variant="secondary" type="button" onClick={handleLogout}>
				ログアウト
			</Button>
		</div>
	);
}
