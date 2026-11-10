import { fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter, Link } from "react-router";
import { describe, expect, it } from "vitest";
import { SiteLayout } from "../../../src/react-app/components/SiteLayout";
import { ContactRoute } from "../../../src/react-app/routes/contact";

describe("SiteLayout", () => {
	it("各ページ遷移後もフッターを1つだけ表示し、フッターのリンクで移動できる", async () => {
		const router = createMemoryRouter(
			[
				{
				element: <SiteLayout />,
					children: [
						{ path: "/", element: <Link to="/terms">トップ画面</Link> },
						{ path: "/terms", element: <Link to="/privacy">利用規約画面</Link> },
						{ path: "/privacy", element: <p>プライバシー画面</p> },
						{ path: "/contact", element: <ContactRoute /> },
					],
				},
			],
			{ initialEntries: ["/"] },
		);
		render(<RouterProvider router={router} />);

		expect(screen.getByRole("contentinfo")).toBeInTheDocument();
		expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
		expect(screen.getByRole("link", { name: "利用規約" })).toHaveAttribute("href", "/terms");
		expect(screen.getByRole("link", { name: "プライバシーポリシー" })).toHaveAttribute("href", "/privacy");
		expect(screen.getByRole("link", { name: "ライセンス" })).toHaveAttribute("href", "/licenses");
		expect(screen.getByRole("link", { name: "お問い合わせ" })).toHaveAttribute("href", "/contact");

		fireEvent.click(screen.getByRole("link", { name: "利用規約" }));
		expect(await screen.findByText("利用規約画面")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("link", { name: "利用規約画面" }));
		expect(await screen.findByText("プライバシー画面")).toBeInTheDocument();
		expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
		fireEvent.click(screen.getByRole("link", { name: "お問い合わせ" }));
		expect(await screen.findByRole("heading", { name: "お問い合わせ" })).toBeInTheDocument();
		expect(screen.getByText("info@shukanlog.com")).toBeInTheDocument();
		expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
	});
});
