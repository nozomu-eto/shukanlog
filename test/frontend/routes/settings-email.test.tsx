import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../src/react-app/api/client";
import { renderAppRoute } from "./render-app-route";

const getSessionMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());
const requestEmailChangeMock = vi.hoisted(() => vi.fn());
const changeEmailMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/lib/auth-client", async () => {
	const actual = await vi.importActual<typeof import("../../../src/react-app/lib/auth-client")>(
		"../../../src/react-app/lib/auth-client",
	);
	return {
		...actual,
		authClient: { getSession: getSessionMock, emailOtp: { changeEmail: changeEmailMock } },
	};
});
vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));
vi.mock("../../../src/react-app/api/account", () => ({ requestEmailChange: requestEmailChangeMock }));

let email: string;

function meResponse() {
	return {
		user: { email },
		accountCreatedDate: "2020-01-01",
		profile: { calorieTrackingEnabled: true },
		consent: { currentVersion: "2026-09-25", agreed: true },
		justCanceledWithdrawal: false,
	};
}

async function fillAndSendRequest(user: ReturnType<typeof userEvent.setup>) {
	await user.type(await screen.findByLabelText("新しいメールアドレス"), "new@example.com");
	await user.type(screen.getByLabelText("現在のパスワード"), "password-123");
	await user.click(screen.getByRole("button", { name: "確認コードを送る" }));
}

describe("メールアドレスの変更(/app/settings/email)", () => {
	beforeEach(() => {
		email = "old@example.com";
		getSessionMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
		getMeMock.mockReset();
		getMeMock.mockImplementation(() => Promise.resolve(meResponse()));
		requestEmailChangeMock.mockReset();
		requestEmailChangeMock.mockResolvedValue({ success: true });
		changeEmailMock.mockReset();
		changeEmailMock.mockImplementation(() => {
			email = "new@example.com";
			return Promise.resolve({ data: {}, error: null });
		});
	});

	it("現在のメールアドレスを親のloaderの値で表示する", async () => {
		renderAppRoute("/app/settings/email", <div />);
		expect(await screen.findByText("old@example.com")).toBeInTheDocument();
	});

	it("確認コードの送信→コードの検証→完了まで進み、完了後に/api/meが取り直される", async () => {
		const user = userEvent.setup();
		renderAppRoute("/app/settings/email", <div />);
		await fillAndSendRequest(user);

		expect(requestEmailChangeMock).toHaveBeenCalledWith("new@example.com", "password-123");
		await user.type(await screen.findByLabelText("確認コード"), "123456");
		const meCallsBeforeVerify = getMeMock.mock.calls.length;
		await user.click(screen.getByRole("button", { name: "変更する" }));

		expect(changeEmailMock).toHaveBeenCalledWith({ newEmail: "new@example.com", otp: "123456" });
		expect(await screen.findByText(/メールアドレスを変更しました/)).toBeInTheDocument();
		// action後の自動再取得で、/api/meが取り直される
		await waitFor(() => expect(getMeMock.mock.calls.length).toBeGreaterThan(meCallsBeforeVerify));
	});

	it("確認コードの送信に失敗したら、入力画面のままエラーを出す", async () => {
		const user = userEvent.setup();
		requestEmailChangeMock.mockRejectedValue(new ApiError("INVALID_PASSWORD", "現在のパスワードが正しくありません", 400));
		renderAppRoute("/app/settings/email", <div />);
		await fillAndSendRequest(user);

		expect(await screen.findByRole("alert")).toHaveTextContent("現在のパスワードが正しくありません");
		expect(screen.queryByLabelText("確認コード")).not.toBeInTheDocument();
	});

	it("確認コードが違う場合は、コード入力の画面のままエラーを出す", async () => {
		const user = userEvent.setup();
		changeEmailMock.mockResolvedValue({ data: null, error: { code: "INVALID_OTP" } });
		renderAppRoute("/app/settings/email", <div />);
		await fillAndSendRequest(user);

		await user.type(await screen.findByLabelText("確認コード"), "000000");
		await user.click(screen.getByRole("button", { name: "変更する" }));

		expect(await screen.findByRole("alert")).toHaveTextContent("確認コードが正しくありません");
		expect(screen.getByLabelText("確認コード")).toBeInTheDocument();
	});
});
