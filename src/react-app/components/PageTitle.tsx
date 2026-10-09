type PageTitleProps = {
	// ページ名(例: "ログイン")。「<ページ名> | shukanlog」の形でタイトルにする
	title: string;
	// 検索エンジンに載せたくないページ(404など)でtrueにする
	noindex?: boolean;
};

// 画面ごとの<title>(・404のnoindex)を設定する部品。
// React 19のドキュメントメタデータの機能により、コンポーネントの内側で<title>・<meta>を描画すると、
// Reactが自動でそれらを<head>内へ移動させる(useEffectでdocument.titleを書き換える必要がない)。
export function PageTitle({ title, noindex = false }: PageTitleProps) {
	return (
		<>
			<title>{`${title} | shukanlog`}</title>
			{noindex ? <meta name="robots" content="noindex" /> : null}
		</>
	);
}
