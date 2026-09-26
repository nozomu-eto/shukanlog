import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordField } from "../../../src/react-app/components/PasswordField";

describe("PasswordField", () => {
	it("既定ではtype=passwordで、ボタンを押すとtype=textに切り替わりaria-pressedが変わる", async () => {
		const user = userEvent.setup();
		render(<PasswordField label="パスワード" />);

		const input = screen.getByLabelText("パスワード");
		const toggle = screen.getByRole("button", { name: "表示" });
		expect(input).toHaveAttribute("type", "password");
		expect(toggle).toHaveAttribute("aria-pressed", "false");

		await user.click(toggle);

		expect(input).toHaveAttribute("type", "text");
		expect(screen.getByRole("button", { name: "隠す" })).toHaveAttribute("aria-pressed", "true");
	});

	it("エラーがあるとaria-invalidとaria-describedbyが付く", () => {
		render(<PasswordField label="パスワード" error="8文字以上で入力してください" />);
		const input = screen.getByLabelText("パスワード");
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByText("8文字以上で入力してください")).toBeInTheDocument();
	});
});
