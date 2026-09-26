// drizzle のテーブル定義をまとめるバレルファイル。
// 認証テーブル(auth.ts)はBetter Authの `npx auth generate` で生成したもの。
// 記録などのドメインテーブル(records.ts)はステップ2で追加した
export * from "./auth";
export * from "./records";
