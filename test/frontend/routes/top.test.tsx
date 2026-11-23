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

		expect(screen.getByRole("heading", { name: /服薬・運動を記録して、\s*週・月でふりかえる。/ })).toBeInTheDocument();
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

		await user.click(screen.getAllByRole("link", { name: "無料ではじめる" })[0]);
		expect(await screen.findByText("新規登録画面")).toBeInTheDocument();
	});

	it("9つのセクションを順番どおりに表示する", () => {
		useSessionMock.mockReturnValue({ data: null, isPending: false });
		renderTop();

		const h2 = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
		expect(h2).toEqual([
			"毎日の健康習慣、こんなことはありませんか？",
			"日々の実施状況を、無理なく記録できる形に。",
			"服薬は2択、運動は3択。",
			"1週間の記録は、こんなふうに確認できます",
			"日・週・月で、記録を振り返る。",
			"カロリー記録は、必要な方だけ。",
			"はじめ方は3ステップ",
			"今日の状況を、記録するところから。",
		]);
		expect(screen.getByRole("heading", { name: "アカウントを登録" })).toBeInTheDocument();
	});

	it("新規登録・ログインのリンクをファーストビューと最終CTAに置く", () => {
		useSessionMock.mockReturnValue({ data: null, isPending: false });
		renderTop();

		const signups = screen.getAllByRole("link", { name: "無料ではじめる" });
		expect(signups).toHaveLength(2);
		signups.forEach((a) => expect(a).toHaveAttribute("href", "/signup"));
		// ヘッダーのログインリンクを含め、すべてログイン画面へ向く
		const logins = screen.getAllByRole("link", { name: "ログイン" });
		expect(logins).toHaveLength(3);
		logins.forEach((a) => expect(a).toHaveAttribute("href", "/login"));
	});

	it("すべての画像に代替テキストと縦横のサイズを持たせる", () => {
		useSessionMock.mockReturnValue({ data: null, isPending: false });
		renderTop();

		const images = screen.getAllByRole("img");
		// day: ファーストビュー・記録方法・日の比較・カロリー、week: 週の例・比較、month: 比較
		expect(images).toHaveLength(7);
		images.forEach((img) => {
			expect(img.getAttribute("alt")).toBeTruthy();
			expect(img).toHaveAttribute("width");
			expect(img).toHaveAttribute("height");
		});
	});

	it("未記録は実際の画面と同じ「空欄 = 未記録」で説明する", () => {
		useSessionMock.mockReturnValue({ data: null, isPending: false });
		renderTop();

		expect(screen.getByText("空欄 = 未記録")).toBeInTheDocument();
		expect(screen.getByText(/入力がないことを、自動的に「できなかった」とは扱いません/)).toBeInTheDocument();
	});

	it("退会完了のメッセージを表示する", () => {
		useSessionMock.mockReturnValue({ data: null, isPending: false });
		render(
			<MemoryRouter initialEntries={[{ pathname: "/", state: { message: "退会しました" } }]}>
				<Routes>
					<Route path="/" element={<TopRoute />} />
				</Routes>
			</MemoryRouter>,
		);
		expect(screen.getByRole("status")).toHaveTextContent("退会しました");
	});

	it("ログイン済みなら/appへ移動する", () => {
		useSessionMock.mockReturnValue({ data: { user: {} }, isPending: false });
		render(
			<MemoryRouter initialEntries={["/"]}>
				<Routes>
					<Route path="/" element={<TopRoute />} />
					<Route path="/app" element={<div>アプリ画面</div>} />
				</Routes>
			</MemoryRouter>,
		);
		expect(screen.getByText("アプリ画面")).toBeInTheDocument();
	});
});
