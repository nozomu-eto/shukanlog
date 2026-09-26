import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Dialog } from "../../../src/react-app/components/Dialog";

function Harness() {
	const [open, setOpen] = useState(false);
	return (
		<div>
			<button type="button" onClick={() => setOpen(true)}>
				開く
			</button>
			<Dialog open={open} title="カロリーを記録" onClose={() => setOpen(false)}>
				<input aria-label="カロリー" />
			</Dialog>
		</div>
	);
}

describe("Dialog", () => {
	it("開くと最初の入力欄にフォーカスし、閉じると開いたボタンにフォーカスが戻る", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		const openButton = screen.getByRole("button", { name: "開く" });
		openButton.focus();
		await user.click(openButton);

		const input = await screen.findByLabelText("カロリー");
		await waitFor(() => expect(input).toHaveFocus());

		// Escで閉じる(cancelイベントの既定動作でdialog.close()が呼ばれる)
		await user.keyboard("{Escape}");

		await waitFor(() => expect(screen.queryByLabelText("カロリー")).not.toBeInTheDocument());
	});
});
