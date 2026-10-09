import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AppShell } from "../../../src/react-app/routes/app/app-shell";

function renderAppShell(initialEntry: string) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route path="/app" element={<AppShell />}>
					<Route index element={<div>中身</div>} />
				</Route>
			</Routes>
		</MemoryRouter>,
	);
}

describe("AppShell", () => {
	it("日・週・月の切り替えでも、現在のdateクエリパラメータを保持する", () => {
		renderAppShell("/app?tab=day&date=2026-09-24");

		expect(screen.getByRole("link", { name: "週" })).toHaveAttribute("href", "/app?tab=week&date=2026-09-24");
		expect(screen.getByRole("link", { name: "月" })).toHaveAttribute("href", "/app?tab=month&date=2026-09-24");
		expect(screen.getByRole("link", { name: "日" })).toHaveAttribute("href", "/app?tab=day&date=2026-09-24");
	});

	it("dateが無い場合はdateを付けずに切り替える", () => {
		renderAppShell("/app?tab=day");

		expect(screen.getByRole("link", { name: "週" })).toHaveAttribute("href", "/app?tab=week");
	});

	it("現在のタブにaria-current=pageを付ける", () => {
		renderAppShell("/app?tab=week&date=2026-09-24");

		expect(screen.getByRole("link", { name: "週" })).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "日" })).not.toHaveAttribute("aria-current");
	});
});
