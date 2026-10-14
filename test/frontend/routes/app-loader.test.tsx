import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter, type ShouldRevalidateFunctionArgs } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../src/react-app/api/client";
import { AppErrorElement, AppHydrateFallback } from "../../../src/react-app/routes/app/app-boundary";
import {
	APP_ROUTE_ID,
	appLoader,
	appShouldRevalidate,
	consentLoader,
	useAppMe,
} from "../../../src/react-app/routes/app/app-loader";

const getSessionMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { getSession: getSessionMock },
}));
vi.mock("../../../src/react-app/api/me", () => ({
	getMe: getMeMock,
}));

function me(agreed: boolean) {
	return {
		user: { email: "a@example.com" },
		accountCreatedDate: "2026-09-01",
		profile: null,
		consent: { currentVersion: "2026-09-25", agreed },
		justCanceledWithdrawal: false,
	};
}

const LOGGED_IN = { data: { user: { id: "u1" } }, error: null };
const LOGGED_OUT = { data: null, error: null };

function AppBody() {
	return <div>アプリの中身:{useAppMe().user.email}</div>;
}

// 本番のrouter.tsxと同じloader・errorElementの組み合わせで、/login・/consent・/appの振り分けを検証する
function renderAt(path: string) {
	const router = createMemoryRouter(
		[
			{ path: "/login", element: <div>ログイン画面</div> },
			{
				path: "/consent",
				loader: consentLoader,
				HydrateFallback: AppHydrateFallback,
				errorElement: <AppErrorElement />,
				children: [{ index: true, element: <div>同意画面</div> }],
			},
			{
				path: "/app",
				id: APP_ROUTE_ID,
				loader: appLoader,
				shouldRevalidate: appShouldRevalidate,
				HydrateFallback: AppHydrateFallback,
				errorElement: <AppErrorElement />,
				children: [{ index: true, element: <AppBody /> }],
			},
		],
		{ initialEntries: [path] },
	);
	render(<RouterProvider router={router} />);
	return router;
}

beforeEach(() => {
	getSessionMock.mockReset();
	getMeMock.mockReset();
});

describe("appLoader(/app)", () => {
	it("未ログインの場合は/loginへ振り分け、/api/meは呼ばない", async () => {
		getSessionMock.mockResolvedValue(LOGGED_OUT);
		const router = renderAt("/app");
		await waitFor(() => expect(screen.getByText("ログイン画面")).toBeInTheDocument());
		expect(router.state.location.pathname).toBe("/login");
		expect(getMeMock).not.toHaveBeenCalled();
	});

	it("ログイン済みだが未同意の場合は/consentへ振り分ける(/consentに留まり、/appへ戻らない)", async () => {
		getSessionMock.mockResolvedValue(LOGGED_IN);
		getMeMock.mockResolvedValue(me(false));
		const router = renderAt("/app");
		await waitFor(() => expect(screen.getByText("同意画面")).toBeInTheDocument());
		expect(router.state.location.pathname).toBe("/consent");
	});

	it("ログイン済みで同意済みの場合はそのまま表示し、子が親のloaderの結果を受け取れる", async () => {
		getSessionMock.mockResolvedValue(LOGGED_IN);
		getMeMock.mockResolvedValue(me(true));
		renderAt("/app");
		await waitFor(() => expect(screen.getByText("アプリの中身:a@example.com")).toBeInTheDocument());
	});

	it("/api/meが401の場合は未ログイン扱いで/loginへ振り分ける", async () => {
		getSessionMock.mockResolvedValue(LOGGED_IN);
		getMeMock.mockRejectedValue(new ApiError("UNAUTHORIZED", "ログインが必要です", 401));
		renderAt("/app");
		await waitFor(() => expect(screen.getByText("ログイン画面")).toBeInTheDocument());
	});

	it("初回の取得中はHydrateFallbackを表示する", async () => {
		getSessionMock.mockReturnValue(new Promise(() => {}));
		renderAt("/app");
		expect(await screen.findByRole("status", { name: "読み込み中" })).toBeInTheDocument();
	});

	it("/api/meの取得に失敗したら「再読み込み」だけの画面を出し、押すと取得し直す", async () => {
		getSessionMock.mockResolvedValue(LOGGED_IN);
		getMeMock.mockRejectedValueOnce(new ApiError("INTERNAL_ERROR", "内部エラーの詳細", 500));
		getMeMock.mockResolvedValue(me(true));
		renderAt("/app");
		const button = await screen.findByRole("button", { name: "再読み込み" });
		// 内部のエラー内容は画面に出さない
		expect(screen.queryByText("内部エラーの詳細")).not.toBeInTheDocument();
		await userEvent.click(button);
		await waitFor(() => expect(screen.getByText("アプリの中身:a@example.com")).toBeInTheDocument());
	});

	it("セッションの確認自体に失敗した場合は、未ログイン扱いにせずエラー画面を出す", async () => {
		getSessionMock.mockResolvedValue({ data: null, error: { status: 500 } });
		renderAt("/app");
		expect(await screen.findByRole("button", { name: "再読み込み" })).toBeInTheDocument();
	});
});

describe("consentLoader(/consent)", () => {
	it("未ログインの場合は/loginへ振り分ける", async () => {
		getSessionMock.mockResolvedValue(LOGGED_OUT);
		const router = renderAt("/consent");
		await waitFor(() => expect(screen.getByText("ログイン画面")).toBeInTheDocument());
		expect(router.state.location.pathname).toBe("/login");
	});

	it("同意済みの場合は/appへ振り分ける(/appに留まり、/consentへ戻らない)", async () => {
		getSessionMock.mockResolvedValue(LOGGED_IN);
		getMeMock.mockResolvedValue(me(true));
		const router = renderAt("/consent");
		await waitFor(() => expect(screen.getByText(/アプリの中身/)).toBeInTheDocument());
		expect(router.state.location.pathname).toBe("/app");
	});

	it("未同意の場合は同意画面をそのまま表示する", async () => {
		getSessionMock.mockResolvedValue(LOGGED_IN);
		getMeMock.mockResolvedValue(me(false));
		const router = renderAt("/consent");
		await waitFor(() => expect(screen.getByText("同意画面")).toBeInTheDocument());
		expect(router.state.location.pathname).toBe("/consent");
	});
});

describe("appShouldRevalidate(親の再取得の条件)", () => {
	function args(overrides: Partial<ShouldRevalidateFunctionArgs>): ShouldRevalidateFunctionArgs {
		return {
			currentUrl: new URL("http://localhost/app?tab=day&date=2026-10-01"),
			nextUrl: new URL("http://localhost/app?tab=week&date=2026-10-01"),
			currentParams: {},
			nextParams: {},
			defaultShouldRevalidate: true,
			...overrides,
		};
	}

	it("送信を伴わない、同じパスのsearch params(tab・date)の変更ではfalseを返す", () => {
		expect(appShouldRevalidate(args({}))).toBe(false);
		expect(
			appShouldRevalidate(args({ nextUrl: new URL("http://localhost/app?tab=day&date=2026-10-02") })),
		).toBe(false);
	});

	it("送信(action)を伴う場合は、search paramsが変わっても既定の判定に従う", () => {
		expect(appShouldRevalidate(args({ formMethod: "POST" }))).toBe(true);
		expect(appShouldRevalidate(args({ formMethod: "POST", defaultShouldRevalidate: false }))).toBe(false);
	});

	it("search paramsが同じ(再読み込みなど)場合は既定の判定に従い、falseにしない", () => {
		expect(appShouldRevalidate(args({ nextUrl: new URL("http://localhost/app?tab=day&date=2026-10-01") }))).toBe(
			true,
		);
	});

	it("別のパスへの移動は既定の判定に従う", () => {
		expect(appShouldRevalidate(args({ nextUrl: new URL("http://localhost/app/settings") }))).toBe(true);
	});
});
