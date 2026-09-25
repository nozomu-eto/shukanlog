import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusIcon, getStatusLabel } from "../../src/react-app/components/StatusIcon";

describe("StatusIcon", () => {
	it("completedは円を描画する", () => {
		const { container } = render(<StatusIcon status="completed" size={20} />);
		const circle = container.querySelector("circle");
		expect(circle).not.toBeNull();
		expect(circle).toHaveAttribute("stroke", "var(--color-status-completed)");
	});

	it("partialは三角を描画する", () => {
		const { container } = render(<StatusIcon status="partial" size={20} />);
		const path = container.querySelector("path");
		expect(path).not.toBeNull();
		expect(path).toHaveAttribute("stroke", "var(--color-status-partial)");
		expect(path?.getAttribute("d")).toContain("Z");
	});

	it("not_completedはバツを描画する", () => {
		const { container } = render(<StatusIcon status="not_completed" size={20} />);
		const path = container.querySelector("path");
		expect(path).not.toBeNull();
		expect(path).toHaveAttribute("stroke", "var(--color-status-not-completed)");
	});

	it("nullは何も描画しない", () => {
		const { container } = render(<StatusIcon status={null} size={20} />);
		expect(container.querySelector("svg")).toBeNull();
	});
});

describe("getStatusLabel", () => {
	it("状態ごとに正しいラベルを返す", () => {
		expect(getStatusLabel("completed")).toBe("達成");
		expect(getStatusLabel("partial")).toBe("一部達成");
		expect(getStatusLabel("not_completed")).toBe("未達成");
		expect(getStatusLabel(null)).toBe("未記録");
	});
});
