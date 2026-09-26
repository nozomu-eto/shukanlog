import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DayTabRoute } from "../../../src/react-app/routes/app/day-tab";
import { ToastProvider } from "../../../src/react-app/components/Toast";

const getDayMock = vi.hoisted(() => vi.fn());
const putHabitLogMock = vi.hoisted(() => vi.fn());
const getMeMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/days", () => ({ getDay: getDayMock }));
vi.mock("../../../src/react-app/api/habit-logs", () => ({ putHabitLog: putHabitLogMock }));
vi.mock("../../../src/react-app/api/me", () => ({ getMe: getMeMock }));

function baseDay() {
	return {
		date: "2026-09-25",
		habits: [
			{ id: "h1", name: "服薬", kind: "medication", evaluationScale: 2 as const, result: null },
			{ id: "h2", name: "運動", kind: "exercise", evaluationScale: 3 as const, result: null },
		],
		calories: null,
	};
}

function renderDayTab() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<ToastProvider>
				<MemoryRouter initialEntries={["/app?tab=day"]}>
					<Routes>
						<Route path="/app" element={<DayTabRoute />} />
					</Routes>
				</MemoryRouter>
			</ToastProvider>
		</QueryClientProvider>,
	);
}

describe("DayTabRoute", () => {
	beforeEach(() => {
		getMeMock.mockResolvedValue({
			user: { email: "a@example.com" },
			accountCreatedDate: "2020-01-01",
			profile: { calorieTrackingEnabled: true },
			consent: { currentVersion: "2026-09-25", agreed: true },
		});
	});

	it("ボタンを押すと保存され、もう一度押すと取り消される", async () => {
		const user = userEvent.setup();
		getDayMock.mockResolvedValue(baseDay());
		putHabitLogMock.mockResolvedValue({ habitId: "h1", date: "2026-09-25", result: "completed" });

		renderDayTab();

		const buttons = await screen.findAllByRole("button", { name: /できた/ });
		const button = buttons[0];
		await user.click(button);

		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
		expect(putHabitLogMock).toHaveBeenCalledWith({ habitId: "h1", date: expect.any(String), result: "completed" });
		expect(await screen.findByRole("status")).toHaveTextContent("保存しました");

		putHabitLogMock.mockResolvedValue({ habitId: "h1", date: "2026-09-25", result: null });
		await user.click(button);
		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
		expect(await screen.findByRole("status")).toHaveTextContent("記録を取り消しました");
	});

	it("保存に失敗すると表示が元に戻る", async () => {
		const user = userEvent.setup();
		getDayMock.mockResolvedValue(baseDay());
		putHabitLogMock.mockRejectedValue(new Error("network error"));

		renderDayTab();

		const buttons = await screen.findAllByRole("button", { name: /できた/ });
		const button = buttons[0];
		await user.click(button);

		// 楽観的更新でいったん押された状態になり、失敗後に元に戻る
		await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
		expect(await screen.findByRole("status")).toHaveTextContent(
			"保存できませんでした。通信状況を確認して、もう一度お試しください",
		);
	});

	it("今日のときは次の日へ進めない", async () => {
		getDayMock.mockResolvedValue(baseDay());
		renderDayTab();

		await screen.findByRole("heading", { level: 1 });
		const nextButton = screen.getByLabelText("次の日");
		expect(nextButton).toHaveAttribute("aria-disabled", "true");
		expect(nextButton.tagName).not.toBe("A");
	});
});
