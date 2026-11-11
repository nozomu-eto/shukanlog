import { StatusIcon } from "./StatusIcon";
import styles from "./Legend.module.css";

// 週タブ・月タブ共通の凡例(◯達成 △一部達成 ×未達成 空欄 未記録)。docs/week-month-tabs.md 1.6
export function Legend() {
	return (
		<div className={styles.legend}>
			<span className={styles.item}>
				<StatusIcon status="completed" size={16} />
				達成
			</span>
			<span className={styles.item}>
				<StatusIcon status="partial" size={16} />
				一部達成
			</span>
			<span className={styles.item}>
				<StatusIcon status="not_completed" size={16} />
				未達成
			</span>
		<span>空欄 = 未記録</span>
		</div>
	);
}
