import type { EvaluationScale, HabitKind, HabitStatus } from "./types";

// 利用規約への同意時に、まだ無ければ作成する初期データの習慣。
// docs/legacy/initial-habits.ts(旧リポジトリ)から移植したもの
export const INITIAL_HABITS: ReadonlyArray<{
	name: string;
	kind: HabitKind;
	evaluationScale: EvaluationScale;
	status: HabitStatus;
}> = [
	// 服薬: 2段階評価(◯できた / ×できなかった)
	{ name: "服薬", kind: "medication", evaluationScale: 2, status: "active" },
	// 運動: 3段階評価(◯できた / △少し / ×できなかった)
	{ name: "運動", kind: "exercise", evaluationScale: 3, status: "active" },
];
