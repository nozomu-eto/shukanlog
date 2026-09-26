// 記録の状態(達成・一部達成・未達成・未記録)を表す◯△×の記号。
// 形・色・線の太さは docs/design.md 4章と docs/design/mockups/Main.dc.html に合わせている
export type Status = "completed" | "partial" | "not_completed" | null;

interface StatusIconProps {
	status: Status;
	size: number;
}

const STATUS_LABELS: Record<Exclude<Status, null>, string> = {
	completed: "達成",
	partial: "一部達成",
	not_completed: "未達成",
};

// 状態の読み上げ用ラベルを返す(未記録の場合も含む)
export function getStatusLabel(status: Status): string {
	if (status === null) {
		return "未記録";
	}
	return STATUS_LABELS[status];
}

export function StatusIcon({ status, size }: StatusIconProps) {
	// 未記録は何も描かない(空欄)
	if (status === null) {
		return null;
	}

	if (status === "completed") {
		return (
			<svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
				<circle cx="10" cy="10" r="7" fill="none" stroke="var(--color-status-completed)" strokeWidth="2.6" />
			</svg>
		);
	}

	if (status === "partial") {
		return (
			<svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
				<path
					d="M10 3 L17.5 16.5 L2.5 16.5 Z"
					fill="none"
					stroke="var(--color-status-partial)"
					strokeWidth="2.4"
					strokeLinejoin="round"
				/>
			</svg>
		);
	}

	return (
		<svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
			<path
				d="M5 5 L15 15 M15 5 L5 15"
				fill="none"
				stroke="var(--color-status-not-completed)"
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
		</svg>
	);
}
