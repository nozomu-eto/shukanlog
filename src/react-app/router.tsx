import { createBrowserRouter } from "react-router";
import { TopRoute } from "./routes/top";
import { LoginRoute } from "./routes/login";
import { SignupRoute } from "./routes/signup";
import { VerifyRoute } from "./routes/verify";
import { ResetRequestRoute } from "./routes/reset-request";
import { ResetNewRoute } from "./routes/reset-new";
import { ConsentRoute } from "./routes/consent";
import { TermsRoute } from "./routes/terms";
import { PrivacyRoute } from "./routes/privacy";
import { LicensesRoute } from "./routes/licenses";
import { NotFoundRoute } from "./routes/not-found";
import { RequireAuth } from "./routes/app/require-auth";
import { TabsRoute } from "./routes/app/tabs";
import { SettingsRoute } from "./routes/app/settings";
import { SettingsEmailRoute } from "./routes/app/settings-email";
import { SettingsPasswordRoute } from "./routes/app/settings-password";
import { SettingsWithdrawRoute } from "./routes/app/settings-withdraw";

// 画面のルーティング定義。URLはdocs/design.md 8章に合わせている
export const router = createBrowserRouter([
	{ path: "/", element: <TopRoute /> },
	{ path: "/login", element: <LoginRoute /> },
	{ path: "/signup", element: <SignupRoute /> },
	{ path: "/verify", element: <VerifyRoute /> },
	{ path: "/reset", element: <ResetRequestRoute /> },
	{ path: "/reset/new", element: <ResetNewRoute /> },
	{ path: "/consent", element: <ConsentRoute /> },
	{ path: "/terms", element: <TermsRoute /> },
	{ path: "/privacy", element: <PrivacyRoute /> },
	{ path: "/licenses", element: <LicensesRoute /> },
	{
		path: "/app",
		element: <RequireAuth />,
		children: [
			{ index: true, element: <TabsRoute /> },
			{ path: "settings", element: <SettingsRoute /> },
			{ path: "settings/email", element: <SettingsEmailRoute /> },
			{ path: "settings/password", element: <SettingsPasswordRoute /> },
			{ path: "settings/withdraw", element: <SettingsWithdrawRoute /> },
		],
	},
	{ path: "*", element: <NotFoundRoute /> },
]);
