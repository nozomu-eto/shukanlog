import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import { queryClient } from "./lib/query-client";
// Fontsourceで使う太さのCSSだけを読み込む(Google Fontsへは接続しない)
import "@fontsource/zen-maru-gothic/500.css";
import "@fontsource/zen-maru-gothic/700.css";
import "@fontsource/zen-kaku-gothic-new/400.css";
import "@fontsource/zen-kaku-gothic-new/500.css";
import "@fontsource/zen-kaku-gothic-new/700.css";
import "../../styles/tokens.css";
import "../../styles/ui.css";

// アプリのエントリーポイント。React Router を SPA モードで使う(SSR は行わない)。
// QueryClientProviderで、サーバーから取得するデータの取得・更新・キャッシュ(T3)を提供する
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
