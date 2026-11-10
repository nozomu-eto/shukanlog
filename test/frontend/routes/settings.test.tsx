import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { deferred } from "../deferred";
import { renderAppRoute } from "./render-app-route";

const getMeMock = vi.hoisted(() => vi.fn());
const patchProfileMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));
vi.mock("../../../src/react-app/api/profile", () => ({ patchProfile: patchProfileMock }));
vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { signOut: signOutMock, getSession: getSessionMock },
}));

function renderSettings() {
	return renderAppRoute("/app/settings", <div />);
}

describe("SettingsRoute", () => {
	beforeEach(() => {
		getMeMock.mockReset();
		patchProfileMock.mockReset();
		getSessionMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
			justCanceledWithdrawal: false,
		});
	});

	it("登録中のメールアドレスを表示する", async () => {
		renderSettings();
		expect(await screen.findByText("a@example.com")).toBeInTheDocument();
	});

	it("サポートのお問い合わせはメールアプリではなくお問い合わせページへ移動する", async () => {
		renderSettings();
		const contactText = await screen.findByText("お問い合わせ");
		const contactLink = contactText.closest("a");

		expect(contactLink).toHaveAttribute("href", "/contact");
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
		// トーストの枠(role=status)は最初から存在するため、文言の出現を待って確認する
		expect(await screen.findByText("設定を変更しました")).toBeInTheDocument();
	});

	it("切り替えのあと、/api/meが取り直されて画面に反映される(action後の自動再取得)", async () => {
		const user = userEvent.setup();
		const me = {
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
			justCanceledWithdrawal: false,
		};
		getMeMock.mockImplementation(() => Promise.resolve(structuredClone(me)));
		patchProfileMock.mockImplementation((calorieTrackingEnabled: boolean) => {
			me.profile.calorieTrackingEnabled = calorieTrackingEnabled;
			return Promise.resolve({ calorieTrackingEnabled });
		});
		renderSettings();
		const switchEl = await screen.findByRole("switch");
		expect(getMeMock).toHaveBeenCalledTimes(1);

		await user.click(switchEl);

		// 保存のあと、親のloaderが/api/meを取り直す(shouldRevalidateは送信を伴うのでfalseにしない)
		await waitFor(() => expect(getMeMock).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(switchEl).toHaveAttribute("aria-checked", "false"));
	});

	it("取り直しの完了を待つ間も、切り替えた値のまま表示される(ちらつかない)", async () => {
		const user = userEvent.setup();
		const me = (enabled: boolean) => ({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: enabled },
			consent: { currentVersion: "2026-09-25", agreed: true },
			justCanceledWithdrawal: false,
		});
		getMeMock.mockResolvedValueOnce(me(true));
		renderSettings();
		const switchEl = await screen.findByRole("switch");

		const refetch = deferred<ReturnType<typeof me>>();
		getMeMock.mockReturnValueOnce(refetch.promise);
		patchProfileMock.mockResolvedValue({ calorieTrackingEnabled: false });
		await user.click(switchEl);

		// 保存は終わったが/api/meの取り直しが終わっていない間も、スイッチはオフのまま
		await waitFor(() => expect(getMeMock).toHaveBeenCalledTimes(2));
		expect(switchEl).toHaveAttribute("aria-checked", "false");
		refetch.resolve(me(false));
		await waitFor(() => expect(switchEl).toHaveAttribute("aria-checked", "false"));
	});

	it("保存に失敗するとスイッチは元の値に戻り、エラーのトーストを出す", async () => {
		const user = userEvent.setup();
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
			justCanceledWithdrawal: false,
		});
		patchProfileMock.mockRejectedValue(new Error("network"));
		renderSettings();
		const switchEl = await screen.findByRole("switch");

		await user.click(switchEl);

		expect(
			await screen.findByText("設定を変更できませんでした。通信状況を確認して、もう一度お試しください"),
		).toBeInTheDocument();
		expect(switchEl).toHaveAttribute("aria-checked", "true");
	});
});
