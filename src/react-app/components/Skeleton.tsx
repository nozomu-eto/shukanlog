import styles from "./Skeleton.module.css";

interface SkeletonProps {
	width?: string | number;
	height: string | number;
	className?: string;
}

// 読み込み中を表すカードの形の灰色の枠。
// 幅・高さは呼び出し側ごとに異なる(グラフの棒と同じく、あらかじめCSSクラスで用意しきれない値)ため、
// style属性(実行時に決まる値)で指定する。固定の色・角丸はCSSクラス(Skeleton.module.css)側で持つ
export function Skeleton({ width, height, className }: SkeletonProps) {
	const classes = [styles.skeleton, className].filter(Boolean).join(" ");
	return (
		<div
			className={classes}
			aria-hidden="true"
			style={{ width: width ?? "100%", height }}
		/>
	);
}
