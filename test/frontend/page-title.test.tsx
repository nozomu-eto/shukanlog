import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { LoginRoute } from "../../src/react-app/routes/login";
import { TermsRoute } from "../../src/react-app/routes/terms";
import { NotFoundRoute } from "../../src/react-app/routes/not-found";

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
