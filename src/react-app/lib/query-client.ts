import { QueryClient } from "@tanstack/react-query";

// アプリ全体で1つだけ作るQueryClient。
// サーバーから取得するデータ(自分の情報・日ごとの記録など)の取得・更新・キャッシュに使う。
// 記録は他の画面(週・月タブなど)にも影響するため、既定では再取得を積極的に行う設定にしている
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// 画面に戻ってきたときは最新の記録を見せたいため、ウィンドウフォーカス時の再取得を有効にする
			refetchOnWindowFocus: true,
			// 失敗時の自動リトライは行わない(失敗はエラー表示・再読み込みボタンで利用者に伝える)
			retry: false,
		},
	},
});
