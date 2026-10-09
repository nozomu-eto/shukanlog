import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SignupRoute } from "../../../src/react-app/routes/signup";

const signUpEmailMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { signUp: { email: signUpEmailMock } },
	getAuthErrorCode: (error: unknown) => (error as { code?: string } | undefined)?.code,
	withTurnstileToken: (token: string) => ({ headers: { "x-turnstile-token": token } }),
}));

// Turnstileは外部スクリプトを読み込むため、テストでは即座にトークンを返すだけの部品に差し替える
vi.mock("../../../src/react-app/components/Turnstile", () => ({
	Turnstile: ({ onTokenChange }: { onTokenChange: (token: string) => void }) => {
		onTokenChange("test-token");
		return null;
	},
}));

function renderSignup() {
	return render(
		<MemoryRouter initialEntries={["/signup"]}>
			<Routes>
				<Route path="/signup" element={<SignupRoute />} />
				<Route path="/login" element={<div>ログイン画面</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("SignupRoute", () => {
	it("登録済みのメールアドレスでは、退会の取り消し方法を案内する文言とログインへのリンクを表示する", async () => {
		const user = userEvent.setup();
		signUpEmailMock.mockResolvedValue({ error: { code: "USER_ALREADY_EXISTS", status: 422 } });
		renderSignup();

		await user.type(screen.getByLabelText("メールアドレス"), "existing@example.com");
		await user.type(screen.getByLabelText("パスワード"), "password123");
		await user.click(screen.getByRole("button", { name: "確認コードを送る" }));

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(
			"このメールアドレスはすでに登録されています。ログインしてください。退会の手続き中の場合は、30日以内にログインすると退会を取り消せます。",
		);

		const loginLink = within(alert).getByRole("link", { name: "ログイン" });
		expect(loginLink).toHaveAttribute("href", "/login");
		await user.click(loginLink);
		expect(await screen.findByText("ログイン画面")).toBeInTheDocument();
	});
});
