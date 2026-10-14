import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { ToastProvider } from "../../../src/react-app/components/Toast";
import { AppHydrateFallback } from "../../../src/react-app/routes/app/app-boundary";
import { APP_ROUTE_ID, appLoader, appShouldRevalidate } from "../../../src/react-app/routes/app/app-loader";
import { AppShell } from "../../../src/react-app/routes/app/app-shell";
import { settingsAction } from "../../../src/react-app/routes/app/settings-action";
import { settingsEmailAction } from "../../../src/react-app/routes/app/settings-email-action";
import { SettingsRoute } from "../../../src/react-app/routes/app/settings";
import { SettingsEmailRoute } from "../../../src/react-app/routes/app/settings-email";
import { dayAction } from "../../../src/react-app/routes/app/day-action";
import { tabsLoader } from "../../../src/react-app/routes/app/tabs-loader";

// /app配下の画面を、本番のrouter.tsxと同じ親ルート(appLoader・shouldRevalidate・id)と
// 同じindexルート(tabsLoader)の組み合わせで表示するテスト用の関数。
// 呼び出すテストファイル側で、authClient.getSession・api/me・api/summary等のモックを用意しておくこと。
// withShell: trueなら、ヘッダーとタブ切り替え(AppShell)も含めて表示する。
// 画面がトーストを使うため、ToastProviderで包んで描画する
export function renderAppRoute(
	path: string,
	element: ReactNode,
	options: { withShell?: boolean } = {},
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
						children: [
							{ index: true, loader: tabsLoader, action: dayAction, element },
							// 設定系の画面(本番のrouter.tsxと同じaction)
							{ path: "settings", action: settingsAction, element: <SettingsRoute /> },
							{ path: "settings/email", action: settingsEmailAction, element: <SettingsEmailRoute /> },
						],
					},
				],
			},
			{ path: "/login", element: <div>ログイン画面</div> },
			{ path: "/consent", element: <div>同意画面</div> },
		],
		{ initialEntries: [path] },
	);
	render(
		<ToastProvider>
			<RouterProvider router={router} />
		</ToastProvider>,
	);
	return router;
}
