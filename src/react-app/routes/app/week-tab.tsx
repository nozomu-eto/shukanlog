import { useSearchParams, useLoaderData, useRevalidator, Link } from "react-router";
import { type SummaryDay, type SummaryHabit } from "../../api/summary";
import { StatusIcon, getStatusLabel } from "../../components/StatusIcon";
import { Button } from "../../components/Button";
import { PeriodNav } from "../../components/PeriodNav";
import { PageTitle } from "../../components/PageTitle";
import { Legend } from "../../components/Legend";
import { hrefForTab } from "../../lib/tab-links";
import { createHistoryReturnState } from "./history-return-context";
import { todayInTokyo, isFuture } from "../../../shared/domain/date";
import { formatAverageCalories } from "../../../shared/domain/calories";
import { countHabitStatuses } from "../../../shared/domain/summary";
import {
	getWeekRange,
	getPreviousPeriodDate,
	getNextPeriodDate,
	canGoToNextPeriod,
	canReturnToToday,
	formatWeekPeriodDisplay,
} from "../../../shared/domain/period";
import { useAppMe } from "./app-loader";
import { resolveTabDate, tabsLoader } from "./tabs-loader";
import styles from "./week-tab.module.css";

// 期間内の日付一覧(月曜〜日曜)を返す
function datesInRange(from: string, to: string): string[] {
	const dates: string[] = [];
	let current = from;
	while (current <= to) {
		dates.push(current);
		current = new Date(new Date(current + "T00:00:00Z").getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	}
	return dates;
}

// 日付から「9月」「23」のような表示用の断片を取り出す
function monthDayLabel(dateString: string): { month: number; day: number } {
	const [, month, day] = dateString.split("-").map(Number);
	return { month, day };
}

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function formatKcal(value: number): string {
	return value.toLocaleString("ja-JP");
}

// 週タブ。docs/week-month-tabs.md 2章・docs/design/mockups/Week.dc.html・WeekPC.dc.html に合わせている
export function WeekTabRoute() {
	const [searchParams] = useSearchParams();

	const today = todayInTokyo();
	const date = resolveTabDate(searchParams.get("date"), today);
	const period = getWeekRange(date);
	const dates = datesInRange(period.start, period.end);

	// /api/meは親(/app)のloaderで取得済みのものを使う。集計は/appのloader(tabsLoader)が取得した結果
	const me = useAppMe();
	const loaderData = useLoaderData<typeof tabsLoader>();
	const revalidator = useRevalidator();
	const result = loaderData.tab === "week" ? loaderData.result : null;

	const calorieEnabled = me.profile?.calorieTrackingEnabled ?? true;

	function hrefForWeekDate(target: string): string {
		return hrefForTab("week", target);
	}

	if (!result) {
		// URLのtabとloaderの結果が食い違う場合(通常は起きない)は何も描画しない
		return null;
	}
	const summary = "data" in result ? result.data : undefined;
	const daysByDate = new Map<string, SummaryDay>((summary?.days ?? []).map((d) => [d.date, d]));
	const hasAnyRecord =
		summary !== undefined &&
		(summary.days.some((d) => Object.keys(d.results).length > 0 || d.calories !== null) ||
			false);

	function habitCell(habit: SummaryHabit, targetDate: string) {
		const future = isFuture(targetDate, today);
		const isToday = targetDate === today;
		const result = daysByDate.get(targetDate)?.results[habit.id] ?? null;
		const { month, day } = monthDayLabel(targetDate);
		const label = future
			? `${month}月${day}日 未来の日`
			: `${month}月${day}日 ${habit.name} ${getStatusLabel(result)}`;

		if (future) {
			return <span key={targetDate} aria-label={label} className={`${styles.dayCell} ${styles.dayCellFuture}`} />;
		}

		return (
			<Link
				key={targetDate}
				to={hrefForTab("day", targetDate)}
				state={createHistoryReturnState("week", date)}
				aria-label={label}
				className={isToday ? `${styles.dayCell} ${styles.dayCellToday}` : styles.dayCell}
			>
				<StatusIcon status={result} size={20} />
			</Link>
		);
	}

	const maxCalorie = Math.max(1, ...dates.map((d) => daysByDate.get(d)?.calories ?? 0));
	const habits = "data" in result ? result.data.habits : [];
	// 日別リンクの読み上げ名に、日付と各習慣の記録状態をまとめて伝える
	function dayLabel(targetDate: string): string {
		const { month, day } = monthDayLabel(targetDate);
		if (isFuture(targetDate, today)) return `${month}月${day}日 未来の日`;
		const statuses = habits.map((habit) => {
			const status = daysByDate.get(targetDate)?.results[habit.id] ?? null;
			return `${habit.name} ${getStatusLabel(status)}`;
		});
		return `${month}月${day}日 ${statuses.join("、")}`;
	}

	return (
		<div className={styles.body}>
			<PageTitle title={formatWeekPeriodDisplay(period, today)} />
			<div className={styles.navArea}>
				<PeriodNav
					heading={formatWeekPeriodDisplay(period, today)}
					prevHref={hrefForWeekDate(getPreviousPeriodDate(date, "week"))}
					prevLabel="前の週"
					nextHref={canGoToNextPeriod(period, today) ? hrefForWeekDate(getNextPeriodDate(date, "week", today)) : null}
					nextLabel="次の週"
					todayHref={canReturnToToday(period, today) ? hrefForWeekDate(today) : null}
				/>
			</div>

			{"error" in result ? (
				<div role="alert" className={styles.errorCard}>
					<h2 className={styles.errorTitle}>記録を読み込めませんでした</h2>
					<p className={styles.errorDesc}>{result.error}</p>
					<Button type="button" disabled={revalidator.state === "loading"} onClick={() => revalidator.revalidate()}>
						再読み込み
					</Button>
				</div>
			) : (
				<>
					<section className={styles.card}>
						<h2 className={styles.cardTitle}>習慣</h2>
						{!hasAnyRecord ? <p className={styles.emptyNotice}>この期間の記録はまだありません</p> : null}
						<div className={styles.weekdayRow}>
							<span />
							{dates.map((d, i) => {
								const { day } = monthDayLabel(d);
								return (
									<span key={d} className={styles.weekdayCell}>
										<span>{WEEKDAY_LABELS[i]}</span>
										<span className={styles.weekdayDate}>{day}</span>
									</span>
								);
							})}
						</div>
						<div className={styles.desktopWeekView}>
							{habits.map((habit) => {
								const totals = result.data.totals.habits[habit.id];
								const counts = countHabitStatuses(
									result.data.days, habit.id, result.data.accountCreatedDate, today, totals?.eligibleDays ?? 0,
								);
								return (
									<div key={habit.id} className={styles.habitRow}>
										<div className={styles.habitGrid}>
											<span className={styles.habitName}>{habit.name}</span>
											{dates.map((d) => habitCell(habit, d))}
										</div>
										{totals ? (
											<div className={styles.habitTotals}>
												<span>達成 {counts.completed}</span>
												{habit.evaluationScale === 3 ? (
													<span>一部達成 {counts.partial}</span>
												) : null}
												<span>未達成 {counts.notCompleted}</span>
												<span>未記録 {counts.unrecorded}</span>
												<span>/ 対象 {totals.eligibleDays}日</span>
											</div>
										) : null}
									</div>
								);
							})}
						</div>
						<div className={styles.mobileWeekView} role="group" aria-label="日ごとの習慣の記録">
							{dates.map((d, i) => {
								const { month, day } = monthDayLabel(d);
								const future = isFuture(d, today);
								const isToday = d === today;
								const contents = (
									<>
										<span className={`${styles.mobileDayDate} ${isToday ? styles.mobileDayDateToday : ""}`}>
											<span>{WEEKDAY_LABELS[i]}</span>
											<span>{month}/{day}</span>
										</span>
										<span className={styles.mobileDayStatuses}>
											{habits.map((habit) => {
												const status = daysByDate.get(d)?.results[habit.id] ?? null;
												return (
													<span key={habit.id} className={styles.mobileDayStatus}>
														<span className={styles.mobileDayHabit}>{habit.name}</span>
														<StatusIcon status={status} size={20} />
													</span>
												);
											})}
										</span>
										{future ? <span className={styles.mobileFutureLabel}>未来の日</span> : null}
									</>
								);
								return future ? (
									<div key={d} role="group" aria-label={dayLabel(d)} className={`${styles.mobileDayRow} ${styles.mobileDayFuture}`}>
										{contents}
									</div>
								) : (
									<Link
										key={d}
										to={hrefForTab("day", d)}
										state={createHistoryReturnState("week", date)}
										aria-label={dayLabel(d)}
										className={`${styles.mobileDayRow} ${isToday ? styles.mobileDayToday : ""}`}
									>
										{contents}
									</Link>
								);
							})}
							{habits.map((habit) => {
								const totals = result.data.totals.habits[habit.id];
								if (!totals) return null;
								const counts = countHabitStatuses(
									result.data.days, habit.id, result.data.accountCreatedDate, today, totals.eligibleDays,
								);
								return (
									<div key={habit.id} className={styles.mobileHabitTotals}>
										<span className={styles.mobileHabitTotalName}>{habit.name}</span>
										<span>達成 {counts.completed}</span>
										{habit.evaluationScale === 3 ? (
											<span>一部達成 {counts.partial}</span>
										) : null}
										<span>未達成 {counts.notCompleted}</span>
										<span>未記録 {counts.unrecorded}</span>
										<span>/ 対象 {totals.eligibleDays}日</span>
									</div>
								);
							})}
						</div>
					</section>

					{calorieEnabled ? (
						<section className={styles.calorieCard}>
							<div className={styles.calorieCardHeader}>
								<h2 className={styles.cardTitle}>カロリー</h2>
								<span className={styles.calorieAverage}>
									{result.data.totals.calories.average === null ? (
										"記録なし"
									) : (
										<>
											平均{" "}
											<span className={styles.calorieAverageValue}>
												{formatAverageCalories(result.data.totals.calories.average)}
											</span>{" "}
											kcal(記録 {result.data.totals.calories.recordedDays}日)
										</>
									)}
								</span>
							</div>
							<div role="list" aria-label="日別の合計カロリー" className={styles.bars}>
								{dates.map((d, i) => {
									const value = daysByDate.get(d)?.calories ?? null;
									const { month, day } = monthDayLabel(d);
									const barHeight = value ? Math.max(4, Math.round((value / maxCalorie) * 80)) : 0;
									return (
										<div
											key={d}
											role="listitem"
											aria-label={`${month}月${day}日 ${value !== null ? `${formatKcal(value)}kcal` : "記録なし"}`}
											className={styles.bar}
										>
											<span className={styles.barValue}>{value ? formatKcal(value) : ""}</span>
											<div
												className={value ? styles.barShape : undefined}
												style={{ width: "100%", height: `${barHeight}px` }}
											/>
											<span className={styles.barDay}>{WEEKDAY_LABELS[i]}</span>
										</div>
									);
								})}
							</div>
						</section>
					) : null}

					<div className={styles.legendArea}>
						<Legend />
					</div>
				</>
			)}
		</div>
	);
}
