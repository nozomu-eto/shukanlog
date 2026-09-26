import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TabsRoute } from "../../../src/react-app/routes/app/tabs";
import { ToastProvider } from "../../../src/react-app/components/Toast";

const getMeMock = vi.hoisted(() => vi.fn());
const getDayMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));
vi.mock("../../../src/react-app/api/days", () => ({ getDay: getDayMock }));

function renderTabs() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<ToastProvider>
				<MemoryRouter initialEntries={["/app?tab=day"]}>
					<Routes>
						<Route path="/app" element={<TabsRoute />} />
					</Routes>
				</MemoryRouter>
			</ToastProvider>
		</QueryClientProvider>,
	);
}

describe("TabsRoute", () => {
	beforeEach(() => {
		sessionStorage.clear();
		getDayMock.mockResolvedValue({
			date: "2026-09-25",
			habits: [],
			calories: null,
		});
	});

	it("退会を取り消した直後は「退会を取り消しました」を1回だけ表示する", async () => {
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
			justCanceledWithdrawal: true,
		});

		renderTabs();

		expect(await screen.findByText("退会を取り消しました")).toBeInTheDocument();
		expect(sessionStorage.getItem("withdrawal-cancel-toast-shown")).toBe("1");
	});

	it("取り消しが無い場合はトーストを表示しない", async () => {
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
			justCanceledWithdrawal: false,
		});

		renderTabs();
		await getMeMock.mock.results.at(-1)?.value;

		expect(screen.queryByText("退会を取り消しました")).not.toBeInTheDocument();
	});
});
