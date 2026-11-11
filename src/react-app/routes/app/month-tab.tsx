import { useSearchParams, useLoaderData, useRevalidator, Link } from "react-router";
import { type SummaryDay } from "../../api/summary";
import { StatusIcon, getStatusLabel } from "../../components/StatusIcon";
import { Button } from "../../components/Button";
import { PeriodNav } from "../../components/PeriodNav";
import { PageTitle } from "../../components/PageTitle";
import { Legend } from "../../components/Legend";
import { hrefForTab } from "../../lib/tab-links";
import { todayInTokyo, isFuture } from "../../../shared/domain/date";
import { formatAverageCalories } from "../../../shared/domain/calories";
import { countHabitStatuses } from "../../../shared/domain/summary";
import {
	getMonthRange,
	getMonthCalendarCells,
	getPreviousPeriodDate,
	getNextPeriodDate,
	canGoToNextPeriod,
	canReturnToToday,
	formatMonthPeriodDisplay,
} from "../../../shared/domain/period";
import { useAppMe } from "./app-loader";
import { resolveTabDate, tabsLoader } from "./tabs-loader";
import styles from "./month-tab.module.css";

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function formatKcalMobile(value: number): string {
	return String(value);
}

function formatKcalPc(value: number): string {
	return value.toLocaleString("ja-JP");
}

// 月タブ。docs/week-month-tabs.md 3章・docs/design/mockups/Month.dc.html・MonthPC.dc.html・
// MonthCalorieOff.dc.html に合わせている
export function MonthTabRoute() {
	const [searchParams] = useSearchParams();

	const today = todayInTokyo();
	const date = resolveTabDate(searchParams.get("date"), today);
	const period = getMonthRange(date);
	const cells = getMonthCalendarCells(date);

	// /api/meは親(/app)のloaderで取得済みのものを使う。集計は/appのloader(tabsLoader)が取得した結果
	const me = useAppMe();
	const loaderData = useLoaderData<typeof tabsLoader>();
	const revalidator = useRevalidator();
	const result = loaderData.tab === "month" ? loaderData.result : null;

	const calorieEnabled = me.profile?.calorieTrackingEnabled ?? true;

	function hrefForMonthDate(target: string): string {
		return hrefForTab("month", target);
	}

	if (!result) {
		// URLのtabとloaderの結果が食い違う場合(通常は起きない)は何も描画しない
		return null;
	}
	const summary = "data" in result ? result.data : undefined;
	const daysByDate = new Map<string, SummaryDay>((summary?.days ?? []).map((d) => [d.date, d]));
	const hasAnyRecord =
		summary !== undefined &&
		summary.days.some((d) => Object.keys(d.results).length > 0 || d.calories !== null);

	const habits = summary?.habits ?? [];
	const medicationHabit = habits[0];
	const exerciseHabit = habits[1];
	const medicationEligibleDays = medicationHabit ? summary?.totals.habits[medicationHabit.id]?.eligibleDays ?? 0 : 0;
	const exerciseEligibleDays = exerciseHabit ? summary?.totals.habits[exerciseHabit.id]?.eligibleDays ?? 0 : 0;
	const medicationCounts = medicationHabit && summary
		? countHabitStatuses(summary.days, medicationHabit.id, summary.accountCreatedDate, today, medicationEligibleDays)
		: null;
	const exerciseCounts = exerciseHabit && summary
		? countHabitStatuses(summary.days, exerciseHabit.id, summary.accountCreatedDate, today, exerciseEligibleDays)
		: null;

	return (
		<div className={styles.body}>
			<PageTitle title={formatMonthPeriodDisplay(period)} />
			<div className={styles.navArea}>
				<PeriodNav
					heading={formatMonthPeriodDisplay(period)}
					prevHref={hrefForMonthDate(getPreviousPeriodDate(date, "month"))}
					prevLabel="前の月"
					nextHref={
						canGoToNextPeriod(period, today) ? hrefForMonthDate(getNextPeriodDate(date, "month", today)) : null
					}
					nextLabel="次の月"
					todayHref={canReturnToToday(period, today) ? hrefForMonthDate(today) : null}
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
					<section className={styles.calendarCard}>
						{!hasAnyRecord ? <p className={styles.emptyNotice}>この期間の記録はまだありません</p> : null}
						<div className={styles.cellLegendHint}>
							<span>マス内 左:服薬 右:運動{calorieEnabled ? " 下:kcal" : ""}</span>
						</div>
						<div className={styles.weekdayRow}>
							{WEEKDAY_LABELS.map((label) => (
								<span key={label}>{label}</span>
							))}
						</div>
						<div className={styles.calendarGrid}>
							{cells.map((cell, index) => {
								if (!cell) {
									return <span key={index} className={styles.blankCell} />;
								}

								const [, monthStr, dayStr] = cell.date.split("-");
								const monthNum = Number(monthStr);
								const dayNum = Number(dayStr);
								const future = isFuture(cell.date, today);
								const isToday = cell.date === today;

								if (future) {
									return (
										<span key={cell.date} aria-label={`${monthNum}月${dayNum}日 未来の日`} className={styles.futureCell}>
											{dayNum}
										</span>
									);
								}

								const summaryDay = daysByDate.get(cell.date);
								const medResult = medicationHabit ? summaryDay?.results[medicationHabit.id] ?? null : null;
								const exResult = exerciseHabit ? summaryDay?.results[exerciseHabit.id] ?? null : null;
								const calories = calorieEnabled ? summaryDay?.calories ?? null : null;

								const label = `${monthNum}月${dayNum}日 服薬 ${getStatusLabel(medResult)} 運動 ${getStatusLabel(exResult)}${
									calorieEnabled ? (calories !== null ? ` ${formatKcalMobile(calories)}kcal` : " カロリー記録なし") : ""
								}`;

								return (
									<Link
										key={cell.date}
										to={hrefForTab("day", cell.date)}
										aria-label={label}
										className={isToday ? `${styles.dayCell} ${styles.dayCellToday}` : styles.dayCell}
									>
										<span className={styles.dayNumber}>{dayNum}</span>
										<span className={styles.dayStatusRow}>
											<span className={styles.dayStatusSlot}>
												<StatusIcon status={medResult} size={14} />
											</span>
											<span className={styles.dayStatusSlot}>
												<StatusIcon status={exResult} size={14} />
											</span>
										</span>
										{calories !== null ? (
											<span className={styles.dayKcal}>
												<span className={styles.mobileOnly}>{formatKcalMobile(calories)}</span>
												<span className={styles.pcOnly}>{formatKcalPc(calories)}</span>
											</span>
										) : (
											<span className={styles.dayKcal} />
										)}
									</Link>
								);
							})}
						</div>
					</section>

					<div className={styles.side}>
						<div className={styles.hintCard}>
							<span className={styles.hintLabel}>マスの見方</span>
							<span>左:服薬 右:運動{calorieEnabled ? " 下:合計kcal" : ""}</span>
						</div>

						<div className={calorieEnabled ? styles.summary : `${styles.summary} ${styles.summaryNoCalorie}`}>
							{medicationHabit ? (
								<div className={styles.summaryCard}>
									<span className={styles.summaryLabel}>{medicationHabit.name}</span>
									{medicationCounts ? (
										<>
											<span className={styles.summaryValue}>
												<span>達成 {medicationCounts.completed}</span>
												<span>未達成 {medicationCounts.notCompleted}</span>
												<span>未記録 {medicationCounts.unrecorded}</span>
											</span>
											<span className={styles.summarySub}>対象 {result.data.totals.habits[medicationHabit.id]?.eligibleDays ?? 0}日</span>
										</>
									) : null}
								</div>
							) : null}

							{exerciseHabit ? (
								<div className={styles.summaryCard}>
									<span className={styles.summaryLabel}>{exerciseHabit.name}</span>
									{exerciseCounts ? (
										<>
											<span className={styles.summaryValue}>
												<span>達成 {exerciseCounts.completed}</span>
												<span>一部達成 {exerciseCounts.partial}</span>
												<span>未達成 {exerciseCounts.notCompleted}</span>
												<span>未記録 {exerciseCounts.unrecorded}</span>
											</span>
											<span className={styles.summarySub}>対象 {result.data.totals.habits[exerciseHabit.id]?.eligibleDays ?? 0}日</span>
										</>
									) : null}
								</div>
							) : null}

							{calorieEnabled ? (
								<div className={styles.summaryCard}>
									<span className={styles.summaryLabel}>平均カロリー</span>
									<span className={styles.summaryValue}>
										<span className={styles.summaryValueNumber}>
											{result.data.totals.calories.average === null
											? "記録なし"
												: formatAverageCalories(result.data.totals.calories.average)}
										</span>
										{result.data.totals.calories.average === null ? null : " kcal"}
									</span>
									<span className={styles.summarySub}>記録 {result.data.totals.calories.recordedDays}日</span>
								</div>
							) : null}
						</div>

						<Legend />
					</div>
				</>
			)}
		</div>
	);
}
