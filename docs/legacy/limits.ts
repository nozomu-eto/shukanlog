// 旧リポジトリ(Amplify版)の lib/limits.ts。入力上限の定数。
// 新リポジトリでは、サーバー(Honoのzodスキーマ)とフロントエンド(フォームの maxLength/min/max)の
// 両方から参照する1か所の定義として src/shared/ 配下に移植する。

// 習慣名の最大文字数
export const HABIT_NAME_MAX_LENGTH = 50;

// カロリー記録のメモの最大文字数
export const CALORIE_NOTE_MAX_LENGTH = 500;

// カロリーの入力範囲(整数)
export const CALORIE_MIN = 0;
export const CALORIE_MAX = 10000;
