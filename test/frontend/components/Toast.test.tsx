import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "../../../src/react-app/components/Toast";

function ShowToastButton({ message }: { message: string }) {
	const { showToast } = useToast();
	return (
		<button type="button" onClick={() => showToast(message)}>
			表示する
		</button>
	);
}

describe("Toast", () => {
	it("showToastを呼ぶとrole=statusの領域にメッセージが表示され、2秒後に消える", async () => {
		const user = userEvent.setup();
		render(
			<ToastProvider>
				<ShowToastButton message="保存しました" />
			</ToastProvider>,
		);

		expect(screen.queryByText("保存しました")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "表示する" }));

		expect(screen.getByRole("status")).toHaveTextContent("保存しました");

		await waitFor(
			() => {
				expect(screen.queryByText("保存しました")).not.toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});
});
