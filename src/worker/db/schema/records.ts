import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

// 記録機能のテーブル定義。IDはcrypto.randomUUID()で発行する文字列、
// 日時はUNIXミリ秒の整数(既定値はSQLiteのunixepoch関数)、日付はYYYY-MM-DD形式の文字列で保持する。
// すべてのテーブルのuser_idはuser.idを参照し、利用者の退会(物理削除)時に連動して削除する

// 利用者ごとのプロフィール(1ユーザー1件)。カロリー記録の有効/無効の設定を持つ
export const profile = sqliteTable("profile", {
	// user.idをそのまま主キーにする(1ユーザー1件のため)
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	calorieTrackingEnabled: integer("calorie_tracking_enabled", { mode: "boolean" })
		.default(true)
		.notNull(),
	createdAt: integer("created_at")
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at")
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
});

// 習慣(服薬・運動など)。利用規約への同意時に初期データとして作成する
export const habit = sqliteTable(
	"habit",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		// "medication" | "exercise"(src/shared/types.tsのHabitKind)
		kind: text("kind").notNull(),
		// 2 | 3(src/shared/types.tsのEvaluationScale)
		evaluationScale: integer("evaluation_scale").notNull(),
		// "active" | "inactive"(src/shared/types.tsのHabitStatus)
		status: text("status").notNull(),
		sortOrder: integer("sort_order").notNull(),
		createdAt: integer("created_at")
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at")
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		// 同じ利用者が同じ種類(服薬・運動)の習慣を二重に持てないようにする(初期データの二重作成防止)
		unique("habit_user_kind_unique").on(table.userId, table.kind),
		index("habit_userId_idx").on(table.userId),
	],
);

// 習慣ごとの日別の記録。未記録はレコードそのものが無い状態で表す(行が無ければ未記録)
export const habitLog = sqliteTable(
	"habit_log",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		habitId: text("habit_id")
			.notNull()
			.references(() => habit.id, { onDelete: "cascade" }),
		recordDate: text("record_date").notNull(),
		// "completed" | "partial" | "not_completed"(src/shared/types.tsのHabitLogResult)
		result: text("result").notNull(),
		createdAt: integer("created_at")
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at")
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		// 同じ習慣・同じ日の記録は1件だけ(PUT /api/habit-logsでの作成・更新の一意性を保証する)
		unique("habit_log_habit_record_date_unique").on(table.habitId, table.recordDate),
		index("habit_log_user_record_date_idx").on(table.userId, table.recordDate),
	],
);

// カロリー記録。1日に複数件記録できる(日ごとの合計・平均は集計時に計算する)
export const calorieLog = sqliteTable(
	"calorie_log",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		recordDate: text("record_date").notNull(),
		calories: integer("calories").notNull(),
		note: text("note"),
		createdAt: integer("created_at")
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at")
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [index("calorie_log_user_record_date_idx").on(table.userId, table.recordDate)],
);

// 利用規約・プライバシーポリシーへの同意の記録。バージョンごとに1件残す
export const termsAgreement = sqliteTable(
	"terms_agreement",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		policyVersion: text("policy_version").notNull(),
		agreedAt: integer("agreed_at")
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		// 同じ利用者が同じバージョンに二重に同意した記録を残さない(POST /api/consentの重複防止)
		unique("terms_agreement_user_policy_version_unique").on(table.userId, table.policyVersion),
	],
);

// 退会の申請。即時に論理削除(セッションの無効化)し、purgeAfterを過ぎたら定期処理(T12)で
// 物理削除する。canceledAtが無い(null)申請中に、同じ利用者が再度ログインに成功すると
// 取り消しとみなし、canceledAtを記録する(取り消し後は物理削除の対象にしない)
export const accountDeletion = sqliteTable(
	"account_deletion",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		requestedAt: integer("requested_at")
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		// 申請から30日後(物理削除の実行日時の下限)
		purgeAfter: integer("purge_after").notNull(),
		canceledAt: integer("canceled_at"),
	},
	(table) => [index("account_deletion_user_id_idx").on(table.userId)],
);
