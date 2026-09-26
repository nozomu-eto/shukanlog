import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { TermsRoute } from "../../../src/react-app/routes/terms";
import { PrivacyRoute } from "../../../src/react-app/routes/privacy";

describe("利用規約・プライバシーポリシーのページ", () => {
	it("利用規約(/terms)には、実装した退会の仕様(第9条2項)が反映されている", () => {
		render(
			<MemoryRouter>
				<TermsRoute />
			</MemoryRouter>,
		);

		expect(screen.getByRole("heading", { level: 1, name: "利用規約" })).toBeInTheDocument();
		expect(screen.getByText(/退会後30日間は登録情報および記録データを保管します/)).toBeInTheDocument();
		expect(screen.getByText(/2026年9月27日/)).toBeInTheDocument();
	});

	it("プライバシーポリシー(/privacy)には、実装した退会の仕様(8章)が反映されている", () => {
		render(
			<MemoryRouter>
				<PrivacyRoute />
			</MemoryRouter>,
		);

		expect(screen.getByRole("heading", { level: 1, name: "プライバシーポリシー" })).toBeInTheDocument();
		expect(screen.getByText(/退会後30日間は登録情報および記録データを保管し/)).toBeInTheDocument();
		expect(screen.getByText("運動の実施状況の記録")).toBeInTheDocument();
	});
});
