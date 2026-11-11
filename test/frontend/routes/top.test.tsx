import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { TopRoute } from "../../../src/react-app/routes/top";

const useSessionMock = vi.hoisted(() => vi.fn());
vi.mock("../../../src/react-app/lib/auth-client", () => ({
	authClient: { useSession: useSessionMock },
}));

function renderTop() {
	return render(
		<MemoryRouter initialEntries={["/"]}>
			<Routes>
				<Route path="/" element={<TopRoute />} />
				<Route path="/signup" element={<div>新規登録画面</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("トップページ", () => {
	it("服薬・運動の記録と振り返りを伝え、新規登録へ案内する", async () => {
		const user = userEvent.setup();
		useSessionMock.mockReturnValue({ data: null, isPending: false });
		renderTop();

		expect(screen.getByRole("heading", { name: /服薬・運動を記録して\s*週・月でふりかえる/ })).toBeInTheDocument();
		expect(screen.getByText("カロリーは任意")).toBeInTheDocument();
		expect(screen.getByText("使わない場合は、設定からオフにできます")).toBeInTheDocument();

		await user.click(screen.getByRole("link", { name: "無料ではじめる" }));
		expect(await screen.findByText("新規登録画面")).toBeInTheDocument();
	});
});
