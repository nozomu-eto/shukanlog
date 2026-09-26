import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { toDisplayMessage } from "../../api/errors";
import { postCalorieLog, patchCalorieLog, deleteCalorieLog } from "../../api/calorie-logs";
import { validateCalorieAmount, validateCalorieNote } from "../../lib/validators";
import { formatDateForDisplay } from "../../../shared/domain/date";
import styles from "./calorie-form.module.css";

interface CalorieFormProps {
	date: string;
	// nullなら新規作成、値があれば編集
	editing: { id: string; calories: number; note: string | null } | null;
	onClose: () => void;
	// 保存・削除に成功したときに呼ぶ(日ごとの記録の再取得・トースト表示は呼び出し側が行う)
	onSaved: (message: string) => void;
}

// カロリーの記録・編集ダイアログ。docs/design/mockups/CalorieForm.dc.html・CalorieFormPC.dc.html に合わせている
export function CalorieForm({ date, editing, onClose, onSaved }: CalorieFormProps) {
	const [calories, setCalories] = useState(editing ? String(editing.calories) : "");
	const [note, setNote] = useState(editing?.note ?? "");
	const [tried, setTried] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const caloriesError = tried ? validateCalorieAmount(calories) : undefined;
	const noteError = tried ? validateCalorieNote(note) : undefined;

	async function handleSubmit() {
		setTried(true);
		setFormError(null);
		if (validateCalorieAmount(calories) || validateCalorieNote(note)) {
			return;
		}

		setSubmitting(true);
		try {
			const params = { calories: Number(calories), note: note || undefined };
			if (editing) {
				await patchCalorieLog(editing.id, params);
			} else {
				await postCalorieLog({ date, ...params });
			}
			onSaved("保存しました");
		} catch (error) {
			setFormError(toDisplayMessage(error));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete() {
		if (!editing) {
			return;
		}
		setSubmitting(true);
		try {
			await deleteCalorieLog(editing.id);
			onSaved("削除しました");
		} catch (error) {
			setFormError(toDisplayMessage(error));
			setSubmitting(false);
		}
	}

	return (
		<Dialog open title={editing ? "カロリーを編集" : "カロリーを記録"} onClose={onClose}>
			<div className={styles.stack}>
				<span className={styles.dateLabel}>{formatDateForDisplay(date)}</span>
				{!confirmingDelete ? (
					<>
						<div>
							<TextField
								id="calorie-kcal"
								label="カロリー"
								type="text"
								inputMode="numeric"
								placeholder="420"
								value={calories}
								onChange={(e) => setCalories(e.target.value)}
								error={caloriesError}
							/>
						</div>
						<TextField
							id="calorie-note"
							label="メモ(任意)"
							help="例:朝食。500文字まで"
							type="text"
							placeholder="朝食"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							error={noteError}
						/>
						{formError ? <p className={styles.formError}>{formError}</p> : null}
						<Button type="button" onClick={handleSubmit} disabled={submitting}>
							保存する
						</Button>
						<Button type="button" variant="secondary" onClick={onClose}>
							キャンセル
						</Button>
						{editing ? (
							<div className={styles.deleteSection}>
								<Button
									type="button"
									variant="inline"
									className={styles.deleteLink}
									onClick={() => setConfirmingDelete(true)}
								>
									この記録を削除する
								</Button>
							</div>
						) : null}
					</>
				) : (
					<div role="alert" className={styles.confirm}>
						<p className={styles.confirmText}>この記録を削除しますか?元に戻せません。</p>
						{formError ? <p className={styles.formError}>{formError}</p> : null}
						<div className={styles.confirmActions}>
							<Button type="button" variant="secondary" onClick={() => setConfirmingDelete(false)}>
								やめる
							</Button>
							<Button type="button" variant="danger" onClick={handleDelete} disabled={submitting}>
								削除する
							</Button>
						</div>
					</div>
				)}
			</div>
		</Dialog>
	);
}
