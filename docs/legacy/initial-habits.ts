// 旧リポジトリ(Amplify版)の lib/data/initial-data.ts から、初期データの定義だけを抜き出したもの。
// 新規ユーザーが利用規約に同意した時点で、まだ無ければ作成する(何度呼んでも重複作成しない)。
// 新リポジトリでは D1 のテーブル定義に合わせて移植する。

export const INITIAL_HABITS = [
  // 服薬: 2段階評価(◯できた / ×できなかった)
  { name: "服薬", kind: "medication", evaluationScale: 2, status: "active" },
  // 運動: 3段階評価(◯できた / △少し / ×できなかった)
  { name: "運動", kind: "exercise", evaluationScale: 3, status: "active" },
] as const;

// Profile は1ユーザー1件。calorieTrackingEnabled(カロリー記録の有効/無効)の既定値は true
