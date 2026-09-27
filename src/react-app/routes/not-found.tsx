import { Link } from "react-router";
import { PageTitle } from "../components/PageTitle";

// 存在しないURLに対する404ページ。文言はdocs/design/mockups/NotFound.dc.htmlに合わせている。
// 検索エンジンに載せる価値が無いページのため、noindexを付ける
export function NotFoundRoute() {
	return (
		<div>
			<PageTitle title="ページが見つかりません" noindex />
			<h1>ページが見つかりません</h1>
			<p>お探しのページは移動したか、削除された可能性があります。URLをご確認ください。</p>
			<Link to="/app">記録画面へ</Link>
			<Link to="/">トップページへ</Link>
		</div>
	);
}
