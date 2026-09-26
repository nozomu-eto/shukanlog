// フロントエンドとAPIの両方で使う、記録の基本的な型定義

// 習慣の種類。服薬(medication)と運動(exercise)の2種類
export type HabitKind = "medication" | "exercise";

// 習慣の評価の段階。2段階(◯/×)または3段階(◯/△/×)
export type EvaluationScale = 2 | 3;

// 習慣の状態。無効化(inactive)した習慣は日・週・月の画面に表示しないが、記録は残す
export type HabitStatus = "active" | "inactive";

// 習慣の記録の結果。未記録は「記録そのものが無い状態」で表すため、
// この型自体には「未記録」を表す値を含めない(APIではnullで未記録を表す)
export type HabitLogResult = "completed" | "partial" | "not_completed";
