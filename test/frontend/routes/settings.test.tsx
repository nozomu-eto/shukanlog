import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SettingsRoute } from "../../../src/react-app/routes/app/settings";
import { ToastProvider } from "../../../src/react-app/components/Toast";

const getMeMock = vi.hoisted(() => vi.fn());
const patchProfileMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));
vi.mock("../../../src/react-app/api/profile", () => ({ patchProfile: patchProfileMock }));
vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { signOut: signOutMock },
}));

function renderSettings() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<ToastProvider>
				<MemoryRouter initialEntries={["/app/settings"]}>
					<Routes>
						<Route path="/app/settings" element={<SettingsRoute />} />
					</Routes>
				</MemoryRouter>
			</ToastProvider>
		</QueryClientProvider>,
	);
}

describe("SettingsRoute", () => {
	beforeEach(() => {
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
		});
	});

	it("登録中のメールアドレスを表示する", async () => {
		renderSettings();
		expect(await screen.findByText("a@example.com")).toBeInTheDocument();
	});

	it("スイッチを切り替えるとAPIが呼ばれ、表示(aria-checked)が変わる", async () => {
		const user = userEvent.setup();
		const me = {
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
		};
		getMeMock.mockImplementation(() => Promise.resolve(structuredClone(me)));
		patchProfileMock.mockImplementation((calorieTrackingEnabled: boolean) => {
			me.profile.calorieTrackingEnabled = calorieTrackingEnabled;
			return Promise.resolve({ calorieTrackingEnabled });
		});
		renderSettings();

		const switchEl = await screen.findByRole("switch");
		expect(switchEl).toHaveAttribute("aria-checked", "true");

		await user.click(switchEl);

		expect(patchProfileMock).toHaveBeenCalledWith(false);
		await waitFor(() => expect(switchEl).toHaveAttribute("aria-checked", "false"));
		expect(await screen.findByRole("status")).toHaveTextContent("設定を変更しました");
	});
});
