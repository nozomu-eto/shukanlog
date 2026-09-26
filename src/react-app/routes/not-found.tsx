import { Link } from "react-router";

// 存在しないURLに対する404ページ。文言はdocs/design/mockups/NotFound.dc.htmlに合わせている
export function NotFoundRoute() {
	return (
		<div>
			<h1>ページが見つかりません</h1>
			<p>お探しのページは移動したか、削除された可能性があります。URLをご確認ください。</p>
			<Link to="/app">記録画面へ</Link>
			<Link to="/">トップページへ</Link>
		</div>
	);
}
