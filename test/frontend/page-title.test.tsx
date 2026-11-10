import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { LoginRoute } from "../../src/react-app/routes/login";
import { TermsRoute } from "../../src/react-app/routes/terms";
import { NotFoundRoute } from "../../src/react-app/routes/not-found";
import { ContactRoute } from "../../src/react-app/routes/contact";

// React 19のドキュメントメタデータの機能(コンポーネント内の<title>・<meta>が<head>へ
// 自動的に移動する)を使って、画面ごとに正しいタイトルが設定されることを確認する
describe("画面のタイトル", () => {
	it("ログイン画面のタイトルが「ログイン | shukanlog」になる", () => {
		render(
			<MemoryRouter>
				<LoginRoute />
			</MemoryRouter>,
		);

		expect(document.title).toBe("ログイン | shukanlog");
	});

	it("利用規約ページのタイトルが「利用規約 | shukanlog」になる", () => {
		render(
			<MemoryRouter>
				<TermsRoute />
			</MemoryRouter>,
		);

		expect(document.title).toBe("利用規約 | shukanlog");
	});

	it("お問い合わせページのタイトルが設定され、メールアドレスは通常のテキストで表示される", () => {
		render(
			<MemoryRouter>
				<ContactRoute />
			</MemoryRouter>,
		);

		expect(document.title).toBe("お問い合わせ | shukanlog");
		expect(screen.getByText("shukanlogに関するお問い合わせは、以下のメールアドレスまでご連絡ください。")).toBeInTheDocument();
		expect(screen.getByText("info@shukanlog.com").tagName).toBe("P");
		expect(screen.queryByRole("link", { name: "info@shukanlog.com" })).not.toBeInTheDocument();
		expect(document.querySelector("form")).toBeNull();
	});

	it("404ページのタイトルが設定され、noindexのmetaが付く", () => {
		render(
			<MemoryRouter>
				<NotFoundRoute />
			</MemoryRouter>,
		);

		expect(document.title).toBe("ページが見つかりません | shukanlog");
		const robotsMeta = document.querySelector('meta[name="robots"]');
		expect(robotsMeta).not.toBeNull();
		expect(robotsMeta?.getAttribute("content")).toBe("noindex");
	});
});
