import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RedirectIfAuthenticated } from "../../../src/react-app/routes/redirect-if-authenticated";

const useSessionMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { useSession: useSessionMock },
}));

function renderWithProviders() {
	return render(
		<MemoryRouter initialEntries={["/login"]}>
			<Routes>
				<Route path="/app" element={<div>アプリの中身</div>} />
				<Route path="/login" element={<RedirectIfAuthenticated />}>
					<Route index element={<div>ログイン画面</div>} />
				</Route>
			</Routes>
		</MemoryRouter>,
	);
}

describe("RedirectIfAuthenticated", () => {
	it("未ログインならそのまま表示する", async () => {
		useSessionMock.mockReturnValue({ data: null, isPending: false });
		renderWithProviders();
		await waitFor(() => expect(screen.getByText("ログイン画面")).toBeInTheDocument());
	});

	it("ログイン済みなら/appへ振り分ける", async () => {
		useSessionMock.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false });
		renderWithProviders();
		await waitFor(() => expect(screen.getByText("アプリの中身")).toBeInTheDocument());
	});
});
