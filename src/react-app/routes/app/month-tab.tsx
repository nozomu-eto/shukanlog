import { useSearchParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getSummary, type SummaryDay } from "../../api/summary";
import { getMe } from "../../api/me";
import { toDisplayMessage } from "../../api/errors";
import { StatusIcon, getStatusLabel } from "../../components/StatusIcon";
import { Skeleton } from "../../components/Skeleton";
import { Button } from "../../components/Button";
import { PeriodNav } from "../../components/PeriodNav";
import { Legend } from "../../components/Legend";
import { hrefForTab } from "../../lib/tab-links";
import { todayInTokyo, isValidDateString, isFuture } from "../../../shared/domain/date";
import {
	getMonthRange,
	getMonthCalendarCells,
	getPreviousPeriodDate,
	getNextPeriodDate,
	canGoToNextPeriod,
	canReturnToToday,
	formatMonthPeriodDisplay,
} from "../../../shared/domain/period";
import styles from "./month-tab.module.css";

// URLのdateクエリパラメータから、実際に表示する月の基準日を決める(week-month-tabs.md 1.1)
function resolveDate(rawDate: string | null, today: string): string {
	if (!rawDate || !isValidDateString(rawDate) || isFuture(rawDate, today)) {
		return today;
	}
	return rawDate;
}

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
	const date = resolveDate(searchParams.get("date"), today);
	const period = getMonthRange(date);
	const cells = getMonthCalendarCells(date);

	const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
	const summaryQuery = useQuery({
		queryKey: ["summary", period.start, period.end],
		queryFn: () => getSummary(period.start, period.end),
	});

	const calorieEnabled = meQuery.data?.profile?.calorieTrackingEnabled ?? true;

	function hrefForMonthDate(target: string): string {
		return hrefForTab("month", target);
	}

	const daysByDate = new Map<string, SummaryDay>((summaryQuery.data?.days ?? []).map((d) => [d.date, d]));
	const hasAnyRecord =
		summaryQuery.data !== undefined &&
		summaryQuery.data.days.some((d) => Object.keys(d.results).length > 0 || d.calories !== null);

	const habits = summaryQuery.data?.habits ?? [];
	const medicationHabit = habits[0];
	const exerciseHabit = habits[1];

	return (
		<div className={styles.body}>
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

			{summaryQuery.isPending ? (
				<>
					<div className={styles.calendarCard} aria-hidden="true">
						<Skeleton height={280} />
					</div>
					<p role="status" className="visually-hidden">
						記録を読み込んでいます
					</p>
				</>
			) : summaryQuery.isError ? (
				<div role="alert" className={styles.errorCard}>
					<h2 className={styles.errorTitle}>記録を読み込めませんでした</h2>
					<p className={styles.errorDesc}>{toDisplayMessage(summaryQuery.error)}</p>
					<Button type="button" onClick={() => summaryQuery.refetch()}>
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
									<span className={styles.summaryValue}>
										<StatusIcon status="completed" size={14} />
										<span className={styles.summaryValueNumber}>
											{summaryQuery.data.totals.habits[medicationHabit.id]?.completed ?? 0}
										</span>
									</span>
									<span className={styles.summarySub}>
										/ {summaryQuery.data.totals.habits[medicationHabit.id]?.eligibleDays ?? 0}日
									</span>
								</div>
							) : null}

							{exerciseHabit ? (
								<div className={styles.summaryCard}>
									<span className={styles.summaryLabel}>{exerciseHabit.name}</span>
									<span className={styles.summaryValue}>
										<StatusIcon status="completed" size={14} />
										<span className={styles.summaryValueNumber}>
											{summaryQuery.data.totals.habits[exerciseHabit.id]?.completed ?? 0}
										</span>
										<StatusIcon status="partial" size={14} />
										<span className={styles.summaryValueNumber}>
											{summaryQuery.data.totals.habits[exerciseHabit.id]?.partial ?? 0}
										</span>
									</span>
									<span className={styles.summarySub}>
										/ {summaryQuery.data.totals.habits[exerciseHabit.id]?.eligibleDays ?? 0}日
									</span>
								</div>
							) : null}

							{calorieEnabled ? (
								<div className={styles.summaryCard}>
									<span className={styles.summaryLabel}>平均カロリー</span>
									<span className={styles.summaryValue}>
										<span className={styles.summaryValueNumber}>
											{summaryQuery.data.totals.calories.average === null
												? "記録なし"
												: formatKcalPc(summaryQuery.data.totals.calories.average)}
										</span>
										{summaryQuery.data.totals.calories.average === null ? null : " kcal"}
									</span>
									<span className={styles.summarySub}>記録 {summaryQuery.data.totals.calories.recordedDays}日</span>
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
