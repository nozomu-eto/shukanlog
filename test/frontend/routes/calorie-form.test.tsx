import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CalorieForm } from "../../../src/react-app/routes/app/calorie-form";

const postCalorieLogMock = vi.hoisted(() => vi.fn());
const patchCalorieLogMock = vi.hoisted(() => vi.fn());
const deleteCalorieLogMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/react-app/api/calorie-logs", () => ({
	postCalorieLog: postCalorieLogMock,
	patchCalorieLog: patchCalorieLogMock,
	deleteCalorieLog: deleteCalorieLogMock,
}));

describe("CalorieForm", () => {
	beforeEach(() => {
		postCalorieLogMock.mockReset();
		patchCalorieLogMock.mockReset();
		deleteCalorieLogMock.mockReset();
	});

	it("10001や小数を入力すると保存時にエラーになる", async () => {
		const user = userEvent.setup();
		const onSaved = vi.fn();
		render(<CalorieForm date="2026-09-25" editing={null} onClose={vi.fn()} onSaved={onSaved} />);

		await user.type(screen.getByLabelText("カロリー"), "10001");
		await user.click(screen.getByRole("button", { name: "保存する" }));

		expect(await screen.findByText("0〜10000の整数で入力してください")).toBeInTheDocument();
		expect(postCalorieLogMock).not.toHaveBeenCalled();

		await user.clear(screen.getByLabelText("カロリー"));
		await user.type(screen.getByLabelText("カロリー"), "12.5");
		await user.click(screen.getByRole("button", { name: "保存する" }));
		expect(await screen.findByText("0〜10000の整数で入力してください")).toBeInTheDocument();
	});

	it("新規作成: 入力して保存するとpostCalorieLogが呼ばれ、onSavedが呼ばれる", async () => {
		const user = userEvent.setup();
		const onSaved = vi.fn();
		postCalorieLogMock.mockResolvedValue({ id: "c1", date: "2026-09-25", calories: 420, note: "朝食" });
		render(<CalorieForm date="2026-09-25" editing={null} onClose={vi.fn()} onSaved={onSaved} />);

		await user.type(screen.getByLabelText("カロリー"), "420");
		await user.type(screen.getByLabelText("メモ(任意)"), "朝食");
		await user.click(screen.getByRole("button", { name: "保存する" }));

		await waitFor(() =>
			expect(postCalorieLogMock).toHaveBeenCalledWith({ date: "2026-09-25", calories: 420, note: "朝食" }),
		);
		expect(onSaved).toHaveBeenCalledWith("保存しました");
	});

	it("編集: 既存の値が入っており、変更して保存するとpatchCalorieLogが呼ばれる", async () => {
		const user = userEvent.setup();
		const onSaved = vi.fn();
		patchCalorieLogMock.mockResolvedValue({ id: "c1", date: "2026-09-25", calories: 500, note: "朝食" });
		render(
			<CalorieForm
				date="2026-09-25"
				editing={{ id: "c1", calories: 420, note: "朝食" }}
				onClose={vi.fn()}
				onSaved={onSaved}
			/>,
		);

		expect(screen.getByLabelText("カロリー")).toHaveValue("420");
		await user.clear(screen.getByLabelText("カロリー"));
		await user.type(screen.getByLabelText("カロリー"), "500");
		await user.click(screen.getByRole("button", { name: "保存する" }));

		await waitFor(() =>
			expect(patchCalorieLogMock).toHaveBeenCalledWith("c1", { calories: 500, note: "朝食" }),
		);
		expect(onSaved).toHaveBeenCalledWith("保存しました");
	});

	it("削除は2段階の確認をしてから実行される", async () => {
		const user = userEvent.setup();
		const onSaved = vi.fn();
		deleteCalorieLogMock.mockResolvedValue(undefined);
		render(
			<CalorieForm
				date="2026-09-25"
				editing={{ id: "c1", calories: 420, note: "朝食" }}
				onClose={vi.fn()}
				onSaved={onSaved}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "この記録を削除する" }));
		expect(screen.getByText("この記録を削除しますか?元に戻せません。")).toBeInTheDocument();
		expect(deleteCalorieLogMock).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "削除する" }));
		await waitFor(() => expect(deleteCalorieLogMock).toHaveBeenCalledWith("c1"));
		expect(onSaved).toHaveBeenCalledWith("削除しました");
	});
});
