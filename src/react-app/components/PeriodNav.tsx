import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./PeriodNav.module.css";

type PeriodNavProps = {
	// 主見出し(h1)に表示する期間の文言(日付・週の範囲・月など、呼び出し側で整形したもの)
	heading: string;
	prevHref: string;
	prevLabel: string;
	// nullのときは次への移動を押せない(今日を含む期間を表示している場合)
	nextHref: string | null;
	nextLabel: string;
	// 今日を含まない期間を表示しているときだけ「今日に戻る」ボタンを表示する(week-month-tabs.md 1.3)
	todayHref: string | null;
	// todayHrefがnull(今日を含む期間を表示中)のときに、ボタンの代わりに表示するラベル(日タブの「今日」等)。
	// 省略時は何も表示しない
	todayLabel?: string;
};

// 期間の移動(前へ・見出し・次へ、今日に戻る)。日・週・月タブで共通利用する部品。
// 前後の移動先・可否はsrc/shared/domain/period.tsの関数で呼び出し側が計算し、hrefとして渡す
export function PeriodNav({ heading, prevHref, prevLabel, nextHref, nextLabel, todayHref, todayLabel }: PeriodNavProps) {
	return (
		<div className={styles.periodBar}>
			<Link to={prevHref} aria-label={prevLabel} className={styles.navButton}>
				<ChevronLeft size={20} aria-hidden="true" />
			</Link>
			<div className={styles.dateBlock}>
				<h1 className={styles.dateHeading}>{heading}</h1>
				{todayHref ? (
					<Link to={todayHref} className={styles.todayButton}>
						今日に戻る
					</Link>
				) : todayLabel ? (
					<span className={styles.todayLabel}>{todayLabel}</span>
				) : null}
			</div>
			{nextHref ? (
				<Link to={nextHref} aria-label={nextLabel} className={styles.navButton}>
					<ChevronRight size={20} aria-hidden="true" />
				</Link>
			) : (
				<span aria-label={nextLabel} aria-disabled="true" className={styles.navButton}>
					<ChevronRight size={20} aria-hidden="true" />
				</span>
			)}
		</div>
	);
}
