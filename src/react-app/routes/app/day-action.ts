import type { ActionFunctionArgs } from "react-router";
import type { HabitLogResult } from "../../../shared/types";
import { saveHabitLog, type HabitLogSaveResult } from "../../lib/habit-log-queue";

// フォームの値(文字列)を、習慣の記録の結果に変換する。空文字は「取り消し」(null)。
// 不正な値はundefinedを返す
function parseResult(value: FormDataEntryValue | null): HabitLogResult | null | undefined {
	if (value === "") {
		return null;
	}
	if (value === "completed" || value === "partial" || value === "not_completed") {
		return value;
	}
	return undefined;
}

// 日タブのaction。習慣の記録を1件保存する(PUT /api/habit-logs)。
// 送信は習慣ごとのキュー(saveHabitLog)に積む。React Routerは、同じfetcherで新しい送信をすると
// 前の送信のrequest.signalを中断するが、ここではsignalを使わない。
// そのため中断された送信も最後まで順番に送られ、最後の操作の結果がサーバーに残る
export async function dayAction({ request }: ActionFunctionArgs): Promise<HabitLogSaveResult> {
	const formData = await request.formData();
	const habitId = formData.get("habitId");
	const date = formData.get("date");
	const result = parseResult(formData.get("result"));
	if (typeof habitId !== "string" || typeof date !== "string" || result === undefined) {
		return { ok: false };
	}
	return saveHabitLog({ habitId, date, result });
}
