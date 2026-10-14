import { render } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { AppHydrateFallback } from "../../../src/react-app/routes/app/app-boundary";
import { APP_ROUTE_ID, appLoader, appShouldRevalidate } from "../../../src/react-app/routes/app/app-loader";
import { AppShell } from "../../../src/react-app/routes/app/app-shell";
import { tabsLoader } from "../../../src/react-app/routes/app/tabs-loader";

// /app配下の画面を、本番のrouter.tsxと同じ親ルート(appLoader・shouldRevalidate・id)と
// 同じindexルート(tabsLoader)の組み合わせで表示するテスト用の関数。
// 呼び出すテストファイル側で、authClient.getSession・api/me・api/summary等のモックを用意しておくこと。
// withShell: trueなら、ヘッダーとタブ切り替え(AppShell)も含めて表示する。
// wrapper: 画面がTanStack QueryやToastのProviderを必要とする間(日タブが移行するまで)に使う
export function renderAppRoute(
	path: string,
	element: ReactNode,
	options: { withShell?: boolean; wrapper?: ComponentType<{ children: ReactNode }> } = {},
) {
	const router = createMemoryRouter(
		[
			{
				path: "/app",
				id: APP_ROUTE_ID,
				loader: appLoader,
				shouldRevalidate: appShouldRevalidate,
				HydrateFallback: AppHydrateFallback,
				children: [
					{
						element: options.withShell ? <AppShell /> : undefined,
						children: [{ index: true, loader: tabsLoader, element }],
					},
				],
			},
			{ path: "/login", element: <div>ログイン画面</div> },
			{ path: "/consent", element: <div>同意画面</div> },
		],
		{ initialEntries: [path] },
	);
	render(<RouterProvider router={router} />, { wrapper: options.wrapper });
	return router;
}
