import { describe, expect, it } from "vitest";
import { countHabitStatuses } from "../../../src/shared/domain/summary";

describe("countHabitStatuses", () => {
	it("達成・一部達成・未達成・未記録を区別し、作成日前と未来日を対象外にする", () => {
		const counts = countHabitStatuses(
			[
				{ date: "2026-09-19", results: { h1: "completed" } },
				{ date: "2026-09-20", results: {} },
				{ date: "2026-09-21", results: { h1: "completed" } },
				{ date: "2026-09-22", results: { h1: "partial" } },
				{ date: "2026-09-23", results: { h1: "not_completed" } },
				{ date: "2026-09-24", results: {} },
				{ date: "2026-09-25", results: { h1: "completed" } },
			],
			"h1",
			"2026-09-20",
			"2026-09-24",
			5,
		);

		expect(counts).toEqual({ completed: 1, partial: 1, notCompleted: 1, unrecorded: 2 });
	});

	it("記録のない期間と作成直後の対象日も未記録として数える", () => {
		const counts = countHabitStatuses(
			[
				{ date: "2026-09-23", results: {} },
				{ date: "2026-09-24", results: {} },
				{ date: "2026-09-25", results: {} },
			],
			"h1",
			"2026-09-24",
			"2026-09-24",
			1,
		);

		expect(counts).toEqual({ completed: 0, partial: 0, notCompleted: 0, unrecorded: 1 });
	});
});
