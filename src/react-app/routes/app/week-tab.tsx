import { useSearchParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getSummary, type SummaryDay, type SummaryHabit } from "../../api/summary";
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
	getWeekRange,
	getPreviousPeriodDate,
	getNextPeriodDate,
	canGoToNextPeriod,
	canReturnToToday,
	formatWeekPeriodDisplay,
} from "../../../shared/domain/period";
import styles from "./week-tab.module.css";

// URLのdateクエリパラメータから、実際に表示する週の基準日を決める(week-month-tabs.md 1.1)
function resolveDate(rawDate: string | null, today: string): string {
	if (!rawDate || !isValidDateString(rawDate) || isFuture(rawDate, today)) {
		return today;
	}
	return rawDate;
}

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
	const date = resolveDate(searchParams.get("date"), today);
	const period = getWeekRange(date);
	const dates = datesInRange(period.start, period.end);

	const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
	const summaryQuery = useQuery({
		queryKey: ["summary", period.start, period.end],
		queryFn: () => getSummary(period.start, period.end),
	});

	const calorieEnabled = meQuery.data?.profile?.calorieTrackingEnabled ?? true;

	function hrefForWeekDate(target: string): string {
		return hrefForTab("week", target);
	}

	const daysByDate = new Map<string, SummaryDay>((summaryQuery.data?.days ?? []).map((d) => [d.date, d]));
	const hasAnyRecord =
		summaryQuery.data !== undefined &&
		(summaryQuery.data.days.some((d) => Object.keys(d.results).length > 0 || d.calories !== null) ||
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
				aria-label={label}
				className={isToday ? `${styles.dayCell} ${styles.dayCellToday}` : styles.dayCell}
			>
				<StatusIcon status={result} size={20} />
			</Link>
		);
	}

	const maxCalorie = Math.max(1, ...dates.map((d) => daysByDate.get(d)?.calories ?? 0));

	return (
		<div className={styles.body}>
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

			{summaryQuery.isPending ? (
				<>
					<div className={styles.card} aria-hidden="true">
						<Skeleton width="20%" height={18} />
						<Skeleton height={40} />
						<Skeleton height={40} />
					</div>
					<div className={styles.calorieCard} aria-hidden="true">
						<Skeleton width="30%" height={18} />
						<Skeleton height={100} />
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
						{summaryQuery.data.habits.map((habit) => {
							const totals = summaryQuery.data.totals.habits[habit.id];
							return (
								<div key={habit.id} className={styles.habitRow}>
									<div className={styles.habitGrid}>
										<span className={styles.habitName}>{habit.name}</span>
										{dates.map((d) => habitCell(habit, d))}
									</div>
									{totals ? (
										<div className={styles.habitTotals}>
											<span className={styles.habitTotalItem}>
												<StatusIcon status="completed" size={14} />
												{totals.completed}
											</span>
											{habit.evaluationScale === 3 ? (
												<span className={styles.habitTotalItem}>
													<StatusIcon status="partial" size={14} />
													{totals.partial}
												</span>
											) : null}
											<span>/ {totals.eligibleDays}日</span>
										</div>
									) : null}
								</div>
							);
						})}
					</section>

					{calorieEnabled ? (
						<section className={styles.calorieCard}>
							<div className={styles.calorieCardHeader}>
								<h2 className={styles.cardTitle}>カロリー</h2>
								<span className={styles.calorieAverage}>
									{summaryQuery.data.totals.calories.average === null ? (
										"記録なし"
									) : (
										<>
											平均{" "}
											<span className={styles.calorieAverageValue}>
												{formatKcal(summaryQuery.data.totals.calories.average)}
											</span>{" "}
											kcal(記録 {summaryQuery.data.totals.calories.recordedDays}日)
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
