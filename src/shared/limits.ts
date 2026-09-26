// 入力上限の定数。docs/legacy/limits.ts(旧リポジトリ)から移植したもの。
// フロントエンド(フォームのmaxLength/min/max)とAPI(zodスキーマ)の両方から参照する

// 習慣名の最大文字数
export const HABIT_NAME_MAX_LENGTH = 50;

// カロリー記録のメモの最大文字数
export const CALORIE_NOTE_MAX_LENGTH = 500;

// カロリーの入力範囲(整数)
export const CALORIE_MIN = 0;
export const CALORIE_MAX = 10000;
