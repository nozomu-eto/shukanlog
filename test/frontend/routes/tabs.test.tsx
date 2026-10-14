import { screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TabsRoute } from "../../../src/react-app/routes/app/tabs";
import { ToastProvider } from "../../../src/react-app/components/Toast";
import { renderAppRoute } from "./render-app-route";

const getMeMock = vi.hoisted(() => vi.fn());
const getDayMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));
vi.mock("../../../src/react-app/api/days", () => ({ getDay: getDayMock }));
vi.mock("../../../src/react-app/lib/auth-client", () => ({ authClient: { getSession: getSessionMock } }));

// トースト(ToastProvider)を用意する
function Providers({ children }: { children: ReactNode }) {
	return <ToastProvider>{children}</ToastProvider>;
}

function renderTabs() {
	return renderAppRoute("/app?tab=day", <TabsRoute />, { wrapper: Providers });
}

function meWith(justCanceledWithdrawal: boolean) {
	return {
		user: { email: "a@example.com" },
		accountCreatedDate: "2020-01-01",
		profile: { calorieTrackingEnabled: true },
		consent: { currentVersion: "2026-09-25", agreed: true },
		justCanceledWithdrawal,
	};
}

describe("TabsRoute", () => {
	beforeEach(() => {
		sessionStorage.clear();
		getMeMock.mockReset();
		getSessionMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
		getDayMock.mockResolvedValue({
			date: "2026-09-25",
			habits: [],
			calories: null,
		});
	});

	it("退会を取り消した直後は「退会を取り消しました」を1回だけ表示する", async () => {
		getMeMock.mockResolvedValue(meWith(true));

		renderTabs();

		expect(await screen.findByText("退会を取り消しました")).toBeInTheDocument();
		expect(sessionStorage.getItem("withdrawal-cancel-toast-shown")).toBe("1");
	});

	it("取り消しが無い場合はトーストを表示しない", async () => {
		getMeMock.mockResolvedValue(meWith(false));

		renderTabs();
		await waitFor(() => expect(getDayMock).toHaveBeenCalled());

		expect(screen.queryByText("退会を取り消しました")).not.toBeInTheDocument();
	});

	it("すでに表示済み(目印あり)の場合は、取り消し直後でもトーストを出さない", async () => {
		sessionStorage.setItem("withdrawal-cancel-toast-shown", "1");
		getMeMock.mockResolvedValue(meWith(true));

		renderTabs();
		await waitFor(() => expect(getDayMock).toHaveBeenCalled());

		expect(screen.queryByText("退会を取り消しました")).not.toBeInTheDocument();
	});

	it("日付を移動してloaderが取り直されても、トーストは1回だけ", async () => {
		getMeMock.mockResolvedValue(meWith(true));
		const router = renderTabs();
		expect(await screen.findByText("退会を取り消しました")).toBeInTheDocument();

		await router.navigate("/app?tab=day&date=2026-09-20");
		await waitFor(() => expect(getDayMock).toHaveBeenCalledWith("2026-09-20"));

		expect(screen.getAllByText("退会を取り消しました")).toHaveLength(1);
	});
});
