import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../src/react-app/api/client";
import { ConsentRoute } from "../../../src/react-app/routes/consent";
import { consentAction } from "../../../src/react-app/routes/consent-action";
import { appLoader, consentLoader } from "../../../src/react-app/routes/app/app-loader";

const getSessionMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());
const postConsentMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { getSession: getSessionMock, signOut: vi.fn() },
}));
vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock, postConsent: postConsentMock }));

// サーバー側の同意状況を模した状態
let agreed: boolean;

function meResponse() {
	return {
		user: { email: "a@example.com" },
		accountCreatedDate: "2026-09-01",
		profile: null,
		consent: { currentVersion: "2026-09-25", agreed },
		justCanceledWithdrawal: false,
	};
}

// 本番のrouter.tsxと同じ組み合わせ(/consentのloader・indexルートのaction、/appのloader)
function renderConsent() {
	const router = createMemoryRouter(
		[
			{ path: "/login", element: <div>ログイン画面</div> },
			{
				path: "/consent",
				loader: consentLoader,
				children: [{ index: true, action: consentAction, element: <ConsentRoute /> }],
			},
			{ path: "/app", loader: appLoader, element: <div>アプリの中身</div> },
		],
		{ initialEntries: ["/consent"] },
	);
	render(<RouterProvider router={router} />);
	return router;
}

describe("同意画面(/consent)", () => {
	beforeEach(() => {
		agreed = false;
		getSessionMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
		getMeMock.mockReset();
		getMeMock.mockImplementation(() => Promise.resolve(meResponse()));
		postConsentMock.mockReset();
		postConsentMock.mockImplementation(() => {
			agreed = true;
			return Promise.resolve(meResponse());
		});
	});

	it("同意して送信すると/appへ移動し、同意済みとして表示される(/consentには戻らない)", async () => {
		const user = userEvent.setup();
		const router = renderConsent();

		await user.click(await screen.findByRole("checkbox"));
		await user.click(screen.getByRole("button", { name: "同意してはじめる" }));

		await waitFor(() => expect(screen.getByText("アプリの中身")).toBeInTheDocument());
		expect(router.state.location.pathname).toBe("/app");
		expect(postConsentMock).toHaveBeenCalledTimes(1);
	});

	it("チェックしないまま送信するとエラーを出し、APIは呼ばない", async () => {
		const user = userEvent.setup();
		renderConsent();

		await user.click(await screen.findByRole("button", { name: "同意してはじめる" }));

		expect(await screen.findByText("続けるには同意が必要です")).toBeInTheDocument();
		expect(postConsentMock).not.toHaveBeenCalled();
	});

	it("送信に失敗したらエラーを出し、同意画面に留まる", async () => {
		const user = userEvent.setup();
		postConsentMock.mockRejectedValue(new ApiError("INTERNAL_ERROR", "サーバーで問題が起きました", 500));
		const router = renderConsent();

		await user.click(await screen.findByRole("checkbox"));
		await user.click(screen.getByRole("button", { name: "同意してはじめる" }));

		expect(await screen.findByText("サーバーで問題が起きました")).toBeInTheDocument();
		expect(router.state.location.pathname).toBe("/consent");
	});
});
