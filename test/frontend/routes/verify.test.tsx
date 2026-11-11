import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VerifyRoute } from "../../../src/react-app/routes/verify";

const { sendVerificationOtpMock, verifyEmailMock } = vi.hoisted(() => ({
	sendVerificationOtpMock: vi.fn(),
	verifyEmailMock: vi.fn(),
}));

vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { emailOtp: { sendVerificationOtp: sendVerificationOtpMock, verifyEmail: verifyEmailMock } },
	getAuthErrorCode: (error: unknown) => (error as { code?: string } | undefined)?.code,
}));

function renderVerify() {
	return render(
		<MemoryRouter initialEntries={[{ pathname: "/verify", state: { email: "user@example.com" } }]}>
			<Routes>
				<Route path="/verify" element={<VerifyRoute />} />
				<Route path="/signup" element={<div>登録画面</div>} />
				<Route path="/consent" element={<div>同意画面</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("VerifyRoute の確認コード再送", () => {
	beforeEach(() => {
		sendVerificationOtpMock.mockReset();
		verifyEmailMock.mockReset();
	});

	it("送信成功時だけ成功表示を出し、60秒間は再送を止める", async () => {
		const user = userEvent.setup();
		sendVerificationOtpMock.mockResolvedValue({ data: {}, error: null });
		renderVerify();

		await user.click(screen.getByRole("button", { name: "確認コードを再送する" }));

		expect(await screen.findByRole("status")).toHaveTextContent("確認コードを再送しました。有効期限は10分です。");
		expect(screen.getByRole("button", { name: /60秒後に再送できます/ })).toBeDisabled();
	});

	it("APIエラーでは成功表示を出さず、再試行方法を案内する", async () => {
		const user = userEvent.setup();
		sendVerificationOtpMock.mockResolvedValue({ data: null, error: { status: 500 } });
		renderVerify();

		await user.click(screen.getByRole("button", { name: "確認コードを再送する" }));

		expect(await screen.findByRole("alert")).toHaveTextContent("通信状況を確認して、もう一度お試しください。");
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "確認コードを再送する" })).toBeEnabled();
	});

	it("ネットワーク例外では成功表示を出さず、再試行方法を案内する", async () => {
		const user = userEvent.setup();
		sendVerificationOtpMock.mockRejectedValue(new TypeError("Network error"));
		renderVerify();

		await user.click(screen.getByRole("button", { name: "確認コードを再送する" }));

		expect(await screen.findByRole("alert")).toHaveTextContent("通信に失敗しました。通信状況を確認して、もう一度お試しください。");
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	it("HTTP 429では成功表示を出さず、再送制限中と案内する", async () => {
		const user = userEvent.setup();
		sendVerificationOtpMock.mockResolvedValue({ data: null, error: { status: 429 } });
		renderVerify();

		await user.click(screen.getByRole("button", { name: "確認コードを再送する" }));

		expect(await screen.findByRole("alert")).toHaveTextContent("再送できるまで少しお待ちください。");
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /60秒後に再送できます/ })).toBeDisabled();
	});

	it("送信中の連続クリックを1回のAPI呼び出しにまとめる", async () => {
		const user = userEvent.setup();
		let resolveSend!: (value: { data: object; error: null }) => void;
		sendVerificationOtpMock.mockImplementation(
			() => new Promise((resolve) => { resolveSend = resolve; }),
		);
		renderVerify();
		const resendButton = screen.getByRole("button", { name: "確認コードを再送する" });

		await user.click(resendButton);
		expect(screen.getByRole("button", { name: "送信中…" })).toBeDisabled();
		await user.click(screen.getByRole("button", { name: "送信中…" }));
		expect(sendVerificationOtpMock).toHaveBeenCalledTimes(1);

		resolveSend({ data: {}, error: null });
		expect(await screen.findByRole("status")).toHaveTextContent("確認コードを再送しました。");
	});

	it("有効期限切れのコードから再送できる", async () => {
		const user = userEvent.setup();
		verifyEmailMock.mockResolvedValue({ error: { code: "OTP_EXPIRED", status: 400 } });
		sendVerificationOtpMock.mockResolvedValue({ data: {}, error: null });
		renderVerify();

		await user.type(screen.getByLabelText("確認コード"), "123456");
		await user.click(screen.getByRole("button", { name: "確認する" }));
		expect(await screen.findByText("確認コードの有効期限が切れています。再送してください")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "確認コードを再送する" }));

		expect(await screen.findByRole("status")).toHaveTextContent("確認コードを再送しました。");
	});
});
