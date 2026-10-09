import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { getDay, type DayCalorieItem, type DayHabit, type DayResponse } from "../../api/days";
import { getMe } from "../../api/me";
import { putHabitLog } from "../../api/habit-logs";
import { toDisplayMessage } from "../../api/errors";
import { StatusIcon } from "../../components/StatusIcon";
import { Skeleton } from "../../components/Skeleton";
import { Button } from "../../components/Button";
import { PeriodNav } from "../../components/PeriodNav";
import { useToast } from "../../components/Toast";
import { CalorieForm } from "./calorie-form";
import { todayInTokyo, isValidDateString, isFuture, formatDateForDisplay } from "../../../shared/domain/date";
import { getPreviousPeriodDate, getNextPeriodDate, canGoToNextPeriod, canReturnToToday, getPeriodRange } from "../../../shared/domain/period";
import { hrefForTab } from "../../lib/tab-links";
import type { HabitLogResult } from "../../../shared/types";
import styles from "./day-tab.module.css";

// 習慣の評価段階ごとの選択肢(結果の値・ボタンの文言・見た目のクラス)
const OPTIONS: Record<2 | 3, { result: HabitLogResult; label: string; className: string }[]> = {
	2: [
		{ result: "completed", label: "できた", className: styles.optionCompleted },
		{ result: "not_completed", label: "できなかった", className: styles.optionNotCompleted },
	],
	3: [
		{ result: "completed", label: "できた", className: styles.optionCompleted },
		{ result: "partial", label: "少し", className: styles.optionPartial },
		{ result: "not_completed", label: "できなかった", className: styles.optionNotCompleted },
	],
};

// URLのdateクエリパラメータから、実際に表示する日付を決める。
// 無い・不正な形式・未来の日付の場合は今日として扱う(docs/week-month-tabs.md 1.1)
function resolveDate(rawDate: string | null, today: string): string {
	if (!rawDate || !isValidDateString(rawDate) || isFuture(rawDate, today)) {
		return today;
	}
	return rawDate;
}

function hrefForDate(date: string): string {
	return hrefForTab("day", date);
}

type CalorieDialogState = { mode: "new" } | { mode: "edit"; item: DayCalorieItem };

// カロリーの合計を桁区切り付きで整形する(docs/week-month-tabs.md 2.3等と同じ「桁区切りあり」の表記)
function formatKcal(value: number): string {
	return value.toLocaleString("ja-JP");
}

// 日タブ(記録の表示と保存)。docs/design/mockups/Day.dc.html・DayPC.dc.html・
// DayEmpty/DayLoading/DayError.dc.html・CalorieForm.dc.html に合わせている
export function DayTabRoute() {
	const [searchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const { showToast } = useToast();
	const [calorieDialog, setCalorieDialog] = useState<CalorieDialogState | null>(null);

	const today = todayInTokyo();
	const date = resolveDate(searchParams.get("date"), today);
	const isToday = date === today;

	const dayQuery = useQuery({ queryKey: ["day", date], queryFn: () => getDay(date) });
	const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });

	function handleCalorieSaved(message: string) {
		setCalorieDialog(null);
		queryClient.invalidateQueries({ queryKey: ["day", date] });
		// 週・月タブの集計にもこの日の変更を反映させる(タブを切り替えたときに古い値のままにならないように)
		queryClient.invalidateQueries({ queryKey: ["summary"] });
		showToast(message);
	}

	// 習慣ごとに「直近の操作」の連番を持つ(同じ習慣への連続操作で、後から失敗した古い操作が
	// 新しい操作の結果を巻き戻してしまわないようにするための判定に使う)
	const latestPickRequestRef = useRef(new Map<string, number>());

	// 習慣の記録の保存。TanStack Queryの公式の楽観的更新の書き方(onMutate→onError→onSettled)に揃える。
	// onMutateでcancelQueriesしてから更新するのは、画面に戻ったときの自動再取得(refetchOnWindowFocus)と
	// 重なって、押したばかりの状態が古い表示に戻ってしまうのを防ぐため。
	// 同じ習慣への連続した操作は、最後の操作の結果が画面に残るようにする。scope.idを固定すること
	// で、実際の保存(PUT)自体は発生順に1つずつ実行させ、サーバー側の最終状態も最後の操作と一致
	// させる(scopeはmutationFnの実行だけを直列化し、onMutate/onErrorの実行順は保証しないため、
	// それだけでは古い操作の失敗時ロールバックが新しい操作の楽観的更新を消してしまう可能性がある)。
	// そのため、習慣ごとに直近の操作かどうかをlatestPickRequestRefで判定し、ロールバックは
	// 「この操作より後に、同じ習慣への操作が始まっていない場合」だけ行う
	const pickMutation = useMutation({
		mutationFn: ({ habitId, result }: { habitId: string; result: HabitLogResult | null }) =>
			putHabitLog({ habitId, date, result }),
		scope: { id: "habit-log" },
		onMutate: async ({ habitId, result }) => {
			await queryClient.cancelQueries({ queryKey: ["day", date] });
			const previous = queryClient.getQueryData<DayResponse>(["day", date]);
			const requestId = (latestPickRequestRef.current.get(habitId) ?? 0) + 1;
			latestPickRequestRef.current.set(habitId, requestId);
			queryClient.setQueryData<DayResponse>(["day", date], (old) =>
				old
					? {
							...old,
							habits: old.habits.map((h) => (h.id === habitId ? { ...h, result } : h)),
						}
					: old,
			);
			return { previous, habitId, requestId };
		},
		onError: (_error, _variables, context) => {
			const isLatest = context && latestPickRequestRef.current.get(context.habitId) === context.requestId;
			if (isLatest) {
				queryClient.setQueryData(["day", date], context.previous);
			}
			showToast("保存できませんでした。通信状況を確認して、もう一度お試しください");
		},
		onSuccess: (_data, { result }) => {
			showToast(result === null ? "記録を取り消しました" : "保存しました");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["day", date] });
			// 週・月タブの集計にもこの日の変更を反映させる(タブを切り替えたときに古い値のままにならないように)
			queryClient.invalidateQueries({ queryKey: ["summary"] });
		},
	});

	function handlePick(habit: DayHabit, result: HabitLogResult) {
		const newResult = habit.result === result ? null : result;
		pickMutation.mutate({ habitId: habit.id, result: newResult });
	}

	const dayPeriod = getPeriodRange(date, "day");

	return (
		<div>
			<PeriodNav
				heading={formatDateForDisplay(date)}
				prevHref={hrefForDate(getPreviousPeriodDate(date, "day"))}
				prevLabel="前の日"
				nextHref={canGoToNextPeriod(dayPeriod, today) ? hrefForDate(getNextPeriodDate(date, "day", today)) : null}
				nextLabel="次の日"
				todayHref={canReturnToToday(dayPeriod, today) ? hrefForDate(today) : null}
				todayLabel={isToday ? "今日" : undefined}
			/>

			<div className={styles.body}>
				{dayQuery.isPending ? (
					<>
						<p role="status" className="visually-hidden">
							記録を読み込んでいます
						</p>
						<div className={styles.card} aria-hidden="true">
							<Skeleton width="30%" height={18} />
							<div className={styles.skeletonRow}>
								<Skeleton height={52} />
								<Skeleton height={52} />
							</div>
						</div>
						<div className={styles.card} aria-hidden="true">
							<Skeleton width="30%" height={18} />
							<div className={styles.skeletonRow}>
								<Skeleton height={52} />
								<Skeleton height={52} />
								<Skeleton height={52} />
							</div>
						</div>
					</>
				) : dayQuery.isError ? (
					<div role="alert" className={`${styles.card} ${styles.errorCard}`}>
						<h2 className={styles.errorTitle}>記録を読み込めませんでした</h2>
						<p className={styles.errorDesc}>{toDisplayMessage(dayQuery.error)}</p>
						<Button type="button" onClick={() => dayQuery.refetch()}>
							再読み込み
						</Button>
					</div>
				) : (
					<>
						{isToday &&
						meQuery.data?.accountCreatedDate === today &&
						dayQuery.data.habits.every((h) => h.result === null) ? (
							<section aria-labelledby="welcome-title" className={`${styles.card} ${styles.welcomeCard}`}>
								<h2 id="welcome-title" className={styles.cardTitle}>
									今日の記録をはじめましょう
								</h2>
								<p className={styles.welcomeDesc}>
									服薬と運動は、ボタンを押すだけで保存されます。記録した日は、週・月のタブで振り返れます。
								</p>
							</section>
						) : null}

						{dayQuery.data.habits.map((habit) => (
							<section key={habit.id} className={styles.card}>
								<div className={styles.cardHeader}>
									<h2 className={styles.cardTitle}>{habit.name}</h2>
									<span className={styles.cardHint}>もう一度押すと取り消し</span>
								</div>
								<div className={styles.options}>
									{OPTIONS[habit.evaluationScale].map((opt) => {
										const selected = habit.result === opt.result;
										return (
											<button
												key={opt.result}
												type="button"
												aria-pressed={selected}
												className={selected ? `${styles.option} ${opt.className}` : styles.option}
												onClick={() => handlePick(habit, opt.result)}
											>
												<StatusIcon status={opt.result} size={20} />
												<span>{opt.label}</span>
											</button>
										);
									})}
								</div>
							</section>
						))}

						{dayQuery.data.calories ? (
							<section className={styles.card}>
								<div className={styles.calorieHeader}>
									<h2 className={styles.cardTitle}>カロリー</h2>
									<button
										type="button"
										className={styles.recordButton}
										onClick={() => setCalorieDialog({ mode: "new" })}
									>
										<Plus size={16} aria-hidden="true" />
										記録する
									</button>
								</div>
								{dayQuery.data.calories.items.length > 0 ? (
									<div className={styles.calorieTotal}>
										<span className={styles.calorieTotalValue}>
											{formatKcal(dayQuery.data.calories.total)}
											<span className={styles.calorieTotalUnit}>kcal</span>
										</span>
										<ul className={styles.calorieList}>
											{dayQuery.data.calories.items.map((item) => (
												<li key={item.id}>
													<button
														type="button"
														className={styles.calorieItem}
														aria-label={`${item.note ?? ""} ${item.calories}kcal を編集`}
														onClick={() => setCalorieDialog({ mode: "edit", item })}
													>
														<span>{item.note}</span>
														<span className={styles.calorieItemValue}>{formatKcal(item.calories)} kcal</span>
													</button>
												</li>
											))}
										</ul>
									</div>
								) : (
									<p className={styles.calorieEmpty}>この日のカロリーはまだ記録されていません。</p>
								)}
							</section>
						) : null}
					</>
				)}

				<p className={styles.disclaimer}>
					本サービスは医療機器ではありません。
					<br />
					服薬に関する判断は医師・薬剤師にご相談ください。
				</p>
			</div>

			{calorieDialog ? (
				<CalorieForm
					date={date}
					editing={calorieDialog.mode === "edit" ? calorieDialog.item : null}
					onClose={() => setCalorieDialog(null)}
					onSaved={handleCalorieSaved}
				/>
			) : null}
		</div>
	);
}
