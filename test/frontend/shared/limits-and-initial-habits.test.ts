import { describe, expect, it } from "vitest";
import { CALORIE_MAX, CALORIE_MIN, CALORIE_NOTE_MAX_LENGTH, HABIT_NAME_MAX_LENGTH } from "../../../src/shared/limits";
import { INITIAL_HABITS } from "../../../src/shared/initial-habits";
import { POLICY_VERSION } from "../../../src/shared/policy";

describe("入力上限の定数", () => {
	it("docs/legacy/limits.tsの値と一致する", () => {
		expect(HABIT_NAME_MAX_LENGTH).toBe(50);
		expect(CALORIE_NOTE_MAX_LENGTH).toBe(500);
		expect(CALORIE_MIN).toBe(0);
		expect(CALORIE_MAX).toBe(10000);
	});
});

describe("初期データの習慣", () => {
	it("服薬(2段階)と運動(3段階)の2件が定義されている", () => {
		expect(INITIAL_HABITS).toEqual([
			{ name: "服薬", kind: "medication", evaluationScale: 2, status: "active" },
			{ name: "運動", kind: "exercise", evaluationScale: 3, status: "active" },
		]);
	});
});

describe("利用規約・プライバシーポリシーのバージョン", () => {
	it("2026-09-25である", () => {
		expect(POLICY_VERSION).toBe("2026-09-25");
	});
});
