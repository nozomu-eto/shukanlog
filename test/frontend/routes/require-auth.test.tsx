import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RequireAuth } from "../../../src/react-app/routes/app/require-auth";

const useSessionMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { useSession: useSessionMock },
}));
vi.mock("../../../src/react-app/api/me", () => ({
	getMe: getMeMock,
}));

function renderWithProviders(initialPath = "/app") {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route path="/login" element={<div>ログイン画面</div>} />
					<Route path="/consent" element={<div>同意画面</div>} />
					<Route path="/app" element={<RequireAuth />}>
						<Route index element={<div>アプリの中身</div>} />
					</Route>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("RequireAuth", () => {
	it("未ログインの場合は/loginへ振り分ける", async () => {
		useSessionMock.mockReturnValue({ data: null, isPending: false });
		renderWithProviders();
		await waitFor(() => expect(screen.getByText("ログイン画面")).toBeInTheDocument());
	});

	it("ログイン済みだが未同意の場合は/consentへ振り分ける", async () => {
		useSessionMock.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false });
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2026-09-01",
			profile: null,
			consent: { currentVersion: "2026-09-25", agreed: false },
		});
		renderWithProviders();
		await waitFor(() => expect(screen.getByText("同意画面")).toBeInTheDocument());
	});

	it("ログイン済みで同意済みの場合はそのまま表示する", async () => {
		useSessionMock.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false });
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2026-09-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
		});
		renderWithProviders();
		await waitFor(() => expect(screen.getByText("アプリの中身")).toBeInTheDocument());
	});
});
