import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AppShell } from "../../../src/react-app/routes/app/app-shell";
import { createSettingsReturnState, getSettingsReturnTo } from "../../../src/react-app/routes/app/settings-return-context";

// AppShellはuseNavigationを使うため、MemoryRouterではなくデータルーター(createMemoryRouter)で描画する
function renderAppShell(initialEntry: string) {
	const router = createMemoryRouter(
		[{ path: "/app", element: <AppShell />, children: [{ index: true, element: <div>中身</div> }] }],
		{ initialEntries: [initialEntry] },
	);
	return render(<RouterProvider router={router} />);
}

describe("AppShell", () => {
	it("日・週・月の切り替えでも、現在のdateクエリパラメータを保持する", () => {
		renderAppShell("/app?tab=day&date=2026-09-24");

		expect(screen.getByRole("link", { name: "週" })).toHaveAttribute("href", "/app?tab=week&date=2026-09-24");
		expect(screen.getByRole("link", { name: "月" })).toHaveAttribute("href", "/app?tab=month&date=2026-09-24");
		expect(screen.getByRole("link", { name: "日" })).toHaveAttribute("href", "/app?tab=day&date=2026-09-24");
	});

	it("dateが無い場合はdateを付けずに切り替える", () => {
		renderAppShell("/app?tab=day");

		expect(screen.getByRole("link", { name: "週" })).toHaveAttribute("href", "/app?tab=week");
	});

	it("現在のタブにaria-current=pageを付ける", () => {
		renderAppShell("/app?tab=week&date=2026-09-24");

		expect(screen.getByRole("link", { name: "週" })).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "日" })).not.toHaveAttribute("aria-current");
	});

	it.each(["day", "week", "month"] as const)("%sタブの閲覧位置を設定画面から復元する", (tab) => {
		const state = createSettingsReturnState({
			pathname: "/app",
			search: `?tab=${tab}&date=2026-09-15`,
		});
		expect(getSettingsReturnTo(state)).toBe(`/app?tab=${tab}&date=2026-09-15`);
	});

	it("設定画面を直接開いた場合は/appへ戻る", () => {
		expect(getSettingsReturnTo(null)).toBe("/app");
	});

	it.each([
		{ settingsReturnTo: "https://example.com/" },
		{ settingsReturnTo: "//example.com/app?tab=month" },
		{ settingsReturnTo: "/app/settings?tab=month" },
		{ settingsReturnTo: "/app?tab=month&date=2026-02-30" },
		{ settingsReturnTo: "/app?tab=unexpected&date=2026-09-15" },
	])("不正な戻り先($settingsReturnTo)は安全な/appへ戻す", (state) => {
		expect(getSettingsReturnTo(state)).toBe("/app");
	});

	it("設定中のPCタブ切替リンクにも元の日付を引き継ぐ", () => {
		const router = createMemoryRouter(
			[
				{
					path: "/app",
					element: <AppShell />,
					children: [
						{ index: true, element: <div>記録</div> },
						{ path: "settings", element: <div>設定</div> },
					],
				},
			],
			{
				initialEntries: [
					{
						pathname: "/app/settings",
						state: { settingsReturnTo: "/app?tab=month&date=2026-09-15" },
					},
				],
			},
		);
		render(<RouterProvider router={router} />);

		expect(screen.getByRole("link", { name: "月" })).toHaveAttribute("href", "/app?tab=month&date=2026-09-15");
		expect(screen.getByRole("link", { name: "週" })).toHaveAttribute("href", "/app?tab=week&date=2026-09-15");
	});

	it("設定への移動後もブラウザの戻る・進むで履歴を移動できる", async () => {
		const user = userEvent.setup();
		const router = createMemoryRouter(
			[
				{
					path: "/app",
					element: <AppShell />,
					children: [
						{ index: true, element: <div>記録</div> },
						{ path: "settings", element: <div>設定</div> },
					],
				},
			],
			{ initialEntries: ["/app?tab=month&date=2026-09-15"] },
		);
		render(<RouterProvider router={router} />);

		await user.click(screen.getByRole("link", { name: "設定" }));
		await waitFor(() => expect(router.state.location.pathname).toBe("/app/settings"));
		expect(router.state.location.state).toEqual({ settingsReturnTo: "/app?tab=month&date=2026-09-15" });

		await router.navigate(-1);
		await waitFor(() => expect(router.state.location.pathname).toBe("/app"));
		await router.navigate(1);
		await waitFor(() => expect(router.state.location.pathname).toBe("/app/settings"));
		expect(router.state.location.state).toEqual({ settingsReturnTo: "/app?tab=month&date=2026-09-15" });
	});
});
