import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SettingsPasswordRoute } from "../../../src/react-app/routes/app/settings-password";

const changePasswordMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { changePassword: changePasswordMock },
	getAuthErrorCode: (error: unknown) => (error as { code?: string } | undefined)?.code,
}));

function renderPage() {
	return render(
		<MemoryRouter initialEntries={["/app/settings/password"]}>
			<Routes>
				<Route path="/app/settings/password" element={<SettingsPasswordRoute />} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("SettingsPasswordRoute", () => {
	it("成功すると完了表示になり、revokeOtherSessionsを有効にして呼び出す", async () => {
		const user = userEvent.setup();
		changePasswordMock.mockResolvedValue({ error: null });
		renderPage();

		await user.type(screen.getByLabelText("現在のパスワード"), "current-pass");
		await user.type(screen.getByLabelText("新しいパスワード"), "new-password-123");
		await user.click(screen.getByRole("button", { name: "パスワードを変更する" }));

		expect(changePasswordMock).toHaveBeenCalledWith({
			currentPassword: "current-pass",
			newPassword: "new-password-123",
			revokeOtherSessions: true,
		});
		expect(await screen.findByRole("status")).toHaveTextContent("パスワードを変更しました。");
	});

	it("誤った現在のパスワードでエラーを表示する", async () => {
		const user = userEvent.setup();
		changePasswordMock.mockResolvedValue({ error: { code: "INVALID_PASSWORD", status: 400 } });
		renderPage();

		await user.type(screen.getByLabelText("現在のパスワード"), "wrong-pass");
		await user.type(screen.getByLabelText("新しいパスワード"), "new-password-123");
		await user.click(screen.getByRole("button", { name: "パスワードを変更する" }));

		expect(await screen.findByRole("alert")).toHaveTextContent("現在のパスワードが正しくありません");
	});
});
