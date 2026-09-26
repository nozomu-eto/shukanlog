import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SettingsWithdrawRoute } from "../../../src/react-app/routes/app/settings-withdraw";

const withdrawMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/account", () => ({ withdraw: withdrawMock }));
vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { signOut: signOutMock },
}));

function renderPage() {
	return render(
		<MemoryRouter initialEntries={["/app/settings/withdraw"]}>
			<Routes>
				<Route path="/app/settings/withdraw" element={<SettingsWithdrawRoute />} />
				<Route path="/" element={<div>トップページ</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("SettingsWithdrawRoute", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("パスワードを入力して退会すると、サインアウトしてトップページへ移動する", async () => {
		const user = userEvent.setup();
		withdrawMock.mockResolvedValue({ success: true });
		signOutMock.mockResolvedValue(undefined);
		renderPage();

		await user.type(screen.getByLabelText("パスワード"), "my-password");
		await user.click(screen.getByRole("button", { name: "退会する" }));

		expect(withdrawMock).toHaveBeenCalledWith("my-password");
		expect(await screen.findByText("トップページ")).toBeInTheDocument();
		expect(signOutMock).toHaveBeenCalled();
	});

	it("パスワード未入力では送信されない", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: "退会する" }));

		expect(withdrawMock).not.toHaveBeenCalled();
		expect(screen.getByText("パスワードを入力してください")).toBeInTheDocument();
	});
});
