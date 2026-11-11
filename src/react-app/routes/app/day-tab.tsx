import { useState } from "react";
import { Link, useLocation, useSearchParams, useLoaderData, useRevalidator, useFetcher } from "react-router";
import { Plus } from "lucide-react";
import type { DayCalorieItem, DayHabit } from "../../api/days";
import { StatusIcon } from "../../components/StatusIcon";
import { Button } from "../../components/Button";
import { PeriodNav } from "../../components/PeriodNav";
import { PageTitle } from "../../components/PageTitle";
import { useToast } from "../../components/Toast";
import { CalorieForm } from "./calorie-form";
import { useAppMe } from "./app-loader";
import { resolveTabDate, tabsLoader } from "./tabs-loader";
import type { dayAction } from "./day-action";
import { todayInTokyo, formatDateForDisplay } from "../../../shared/domain/date";
import { getPreviousPeriodDate, getNextPeriodDate, canGoToNextPeriod, canReturnToToday, getPeriodRange } from "../../../shared/domain/period";
import { hrefForTab } from "../../lib/tab-links";
import { getHistoryReturnFromLocation } from "./history-return-context";
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

function hrefForDate(date: string): string {
	return hrefForTab("day", date);
}

type CalorieDialogState = { mode: "new" } | { mode: "edit"; item: DayCalorieItem };

// カロリーの合計を桁区切り付きで整形する(docs/week-month-tabs.md 2.3等と同じ「桁区切りあり」の表記)
function formatKcal(value: number): string {
	return value.toLocaleString("ja-JP");
}

// 習慣1件分のカード。保存はroute action(dayAction)に送る。
// 習慣ごとにfetcherを持つので、ある習慣の保存が終わるのを他の習慣が待たず、表示も習慣ごとに独立する
function HabitCard({ habit, date }: { habit: DayHabit; date: string }) {
	const fetcher = useFetcher<typeof dayAction>();

	// 送信中は、送った値(fetcher.formData)を先に表示する(楽観的更新)。
	// 別の日の画面に移動したあとにその日の表示へ紛れ込まないよう、同じ日のときだけ使う。
	// 保存に失敗すると送信が終わってformDataが消え、loaderの値(サーバーの状態)の表示に戻る
	const sending = fetcher.formData;
	const shownResult: HabitLogResult | null =
		sending && sending.get("date") === date ? toResult(sending.get("result")) : habit.result;

	function handlePick(result: HabitLogResult) {
		// 今の表示と同じボタンをもう一度押したら取り消し(null)にする
		const next = shownResult === result ? null : result;
		fetcher.submit({ habitId: habit.id, date, result: next ?? "" }, { method: "post" });
	}

	return (
		<section className={styles.card}>
			<div className={styles.cardHeader}>
				<h2 className={styles.cardTitle}>{habit.name}</h2>
				<span className={styles.cardHint}>もう一度押すと取り消し</span>
			</div>
			<div className={styles.options}>
				{OPTIONS[habit.evaluationScale].map((opt) => {
					const selected = shownResult === opt.result;
					return (
						<button
							key={opt.result}
							type="button"
							aria-pressed={selected}
							className={selected ? `${styles.option} ${opt.className}` : styles.option}
							onClick={() => handlePick(opt.result)}
						>
							<StatusIcon status={opt.result} size={20} />
							<span>{opt.label}</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}

// フォームの値(文字列)を習慣の記録の結果に戻す。空文字・不正な値はnull(未記録)
function toResult(value: FormDataEntryValue | null): HabitLogResult | null {
	return value === "completed" || value === "partial" || value === "not_completed" ? value : null;
}

// 日タブ(記録の表示と保存)。docs/design/mockups/Day.dc.html・DayPC.dc.html・
// DayEmpty/DayLoading/DayError.dc.html・CalorieForm.dc.html に合わせている。
// 記録の取得は/appのloader(tabsLoader)、習慣の保存はroute action(dayAction)が行う
export function DayTabRoute() {
	const [searchParams] = useSearchParams();
	const location = useLocation();
	const { showToast } = useToast();
	const me = useAppMe();
	const loaderData = useLoaderData<typeof tabsLoader>();
	const revalidator = useRevalidator();
	const [calorieDialog, setCalorieDialog] = useState<CalorieDialogState | null>(null);

	const today = todayInTokyo();
	const date = resolveTabDate(searchParams.get("date"), today);
	const historyReturn = getHistoryReturnFromLocation(location);
	const historyReturnState = historyReturn
		? { historyReturnTo: historyReturn }
		: undefined;
	const isToday = date === today;
	const result = loaderData.tab === "day" ? loaderData.result : null;

	// カロリーの保存・削除に成功したら、loaderを取り直して表示(日・週・月)を最新にする
	function handleCalorieSaved(message: string) {
		setCalorieDialog(null);
		revalidator.revalidate();
		showToast(message);
	}

	if (!result) {
		// URLのtabとloaderの結果が食い違う場合(通常は起きない)は何も描画しない
		return null;
	}

	const dayPeriod = getPeriodRange(date, "day");

	return (
		<div>
			<PageTitle title={formatDateForDisplay(date)} />
			<PeriodNav
				heading={formatDateForDisplay(date)}
				prevHref={hrefForDate(getPreviousPeriodDate(date, "day"))}
				prevLabel="前の日"
				nextHref={canGoToNextPeriod(dayPeriod, today) ? hrefForDate(getNextPeriodDate(date, "day", today)) : null}
				nextLabel="次の日"
				todayHref={canReturnToToday(dayPeriod, today) ? hrefForDate(today) : null}
				todayLabel={isToday ? "今日" : undefined}
				linkState={historyReturnState}
			/>
			{historyReturn ? (
				<div className={styles.returnLinkRow}>
					<Link
						to={hrefForTab(historyReturn.tab, historyReturn.date)}
						className={styles.returnLink}
					>
						{historyReturn.tab === "week" ? "週の表示に戻る" : "月の表示に戻る"}
					</Link>
				</div>
			) : null}

			<div className={styles.body}>
				{"error" in result ? (
					<div role="alert" className={`${styles.card} ${styles.errorCard}`}>
						<h2 className={styles.errorTitle}>記録を読み込めませんでした</h2>
						<p className={styles.errorDesc}>{result.error}</p>
						<Button type="button" disabled={revalidator.state === "loading"} onClick={() => revalidator.revalidate()}>
							再読み込み
						</Button>
					</div>
				) : (
					<div className={result.data.calories ? styles.columns : `${styles.columns} ${styles.columnsWithoutCalories}`}>
						<div className={styles.habitColumn}>
							{isToday &&
							me.accountCreatedDate === today &&
							result.data.habits.every((h) => h.result === null) ? (
								<section aria-labelledby="welcome-title" className={`${styles.card} ${styles.welcomeCard}`}>
									<h2 id="welcome-title" className={styles.cardTitle}>
										今日の記録をはじめましょう
									</h2>
									<p className={styles.welcomeDesc}>
										服薬と運動は、ボタンを押すだけで保存されます。記録した日は週・月のタブで振り返れます。カロリー記録は任意で、設定からオフにできます。
									</p>
								</section>
							) : null}

							{result.data.habits.map((habit) => (
								<HabitCard key={habit.id} habit={habit} date={date} />
							))}
						</div>

						{result.data.calories ? (
							<div className={styles.calorieColumn}>
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
									{result.data.calories.items.length > 0 ? (
										<div className={styles.calorieTotal}>
											<span className={styles.calorieTotalValue}>
												{formatKcal(result.data.calories.total)}
												<span className={styles.calorieTotalUnit}>kcal</span>
											</span>
											<ul className={styles.calorieList}>
												{result.data.calories.items.map((item) => (
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
							</div>
						) : null}
					</div>
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
