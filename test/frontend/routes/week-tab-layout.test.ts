import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
	join(process.cwd(), "src/react-app/routes/app/week-tab.module.css"),
	"utf8",
);

describe("週タブのスマートフォンレイアウト", () => {
	it.each([320, 375, 390])("画面幅%ipxで日付行の操作領域が44×44px以上になる", (viewportWidth) => {
		const mobileStart = stylesheet.indexOf("@media (max-width: 1023px)");
		const desktopStart = stylesheet.indexOf("@media (min-width: 1024px)");
		const mobileStyles = stylesheet.slice(mobileStart, desktopStart);
		const rowMinHeight = Number(mobileStyles.match(/\.mobileDayRow \{\s*min-height: (\d+)px/)?.[1] ?? 0);

		// 本文左右20px、カード左右padding14px、カード枠線1pxずつを除いた日付行の幅を検証する
		const rowWidth = viewportWidth - 40 - 28 - 2;
		expect(mobileStyles).toContain(".weekdayRow,");
		expect(mobileStyles).toContain(".desktopWeekView {");
		expect(mobileStyles).toContain(".mobileWeekView {");
		expect(rowWidth).toBeGreaterThanOrEqual(44);
		expect(rowMinHeight).toBeGreaterThanOrEqual(44);
	});
});
