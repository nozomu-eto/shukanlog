import { createBrowserRouter } from "react-router";
import { TopRoute } from "./routes/top";
import { LoginRoute } from "./routes/login";
import { SignupRoute } from "./routes/signup";
import { VerifyRoute } from "./routes/verify";
import { ResetRequestRoute } from "./routes/reset-request";
import { ResetNewRoute } from "./routes/reset-new";
import { ConsentRoute } from "./routes/consent";
import { RedirectIfAuthenticated } from "./routes/redirect-if-authenticated";
import { TermsRoute } from "./routes/terms";
import { PrivacyRoute } from "./routes/privacy";
import { LicensesRoute } from "./routes/licenses";
import { NotFoundRoute } from "./routes/not-found";
import { APP_ROUTE_ID, appLoader, appShouldRevalidate, consentLoader } from "./routes/app/app-loader";
import { AppErrorElement, AppHydrateFallback } from "./routes/app/app-boundary";
import { AppShell } from "./routes/app/app-shell";
import { TabsRoute } from "./routes/app/tabs";
import { SettingsRoute } from "./routes/app/settings";
import { SettingsEmailRoute } from "./routes/app/settings-email";
import { SettingsPasswordRoute } from "./routes/app/settings-password";
import { SettingsWithdrawRoute } from "./routes/app/settings-withdraw";

// 画面のルーティング定義。URLはdocs/design.md 8章に合わせている。
// ログインと同意の状態による振り分けは、/consentと/appのloader(routes/app/app-loader.ts)が行う。
// /login等は、useSession()で判定するRedirectIfAuthenticatedがOutletの手前で行う
export const router = createBrowserRouter([
	{ path: "/", element: <TopRoute /> },
	{
		// パスを持たない層(レイアウトルート)にすることで、子は/からの相対パスとして解決される
		element: <RedirectIfAuthenticated />,
		children: [
			{ path: "login", element: <LoginRoute /> },
			{ path: "signup", element: <SignupRoute /> },
			{ path: "verify", element: <VerifyRoute /> },
			{ path: "reset", element: <ResetRequestRoute /> },
			{ path: "reset/new", element: <ResetNewRoute /> },
		],
	},
	{
		path: "/consent",
		loader: consentLoader,
		HydrateFallback: AppHydrateFallback,
		errorElement: <AppErrorElement />,
		children: [{ index: true, element: <ConsentRoute /> }],
	},
	{ path: "/terms", element: <TermsRoute /> },
	{ path: "/privacy", element: <PrivacyRoute /> },
	{ path: "/licenses", element: <LicensesRoute /> },
	{
		path: "/app",
		// 子ルートがuseRouteLoaderData(APP_ROUTE_ID)で親のloaderの結果を取り出すためのid
		id: APP_ROUTE_ID,
		loader: appLoader,
		shouldRevalidate: appShouldRevalidate,
		HydrateFallback: AppHydrateFallback,
		errorElement: <AppErrorElement />,
		children: [
			{
				element: <AppShell />,
				children: [
					{ index: true, element: <TabsRoute /> },
					{ path: "settings", element: <SettingsRoute /> },
					{ path: "settings/email", element: <SettingsEmailRoute /> },
					{ path: "settings/password", element: <SettingsPasswordRoute /> },
					{ path: "settings/withdraw", element: <SettingsWithdrawRoute /> },
				],
			},
		],
	},
	{ path: "*", element: <NotFoundRoute /> },
]);
