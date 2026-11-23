import styles from "./ScreenShot.module.css";

interface ScreenShotProps {
	src: string;
	alt: string;
	// 元画像のピクセルサイズ。縦横比を保ちレイアウトシフトを防ぐために使う
	width: number;
	height: number;
	// 表示する縦方向の範囲(元画像のピクセル)。省略時は全体を表示する
	cropTop?: number;
	cropBottom?: number;
	// 表示を遅らせてよい画像か(ファーストビュー以外はtrue)
	lazy?: boolean;
}

// アプリの画面画像を表示する。元画像は変更せず、cropTop〜cropBottomの範囲だけをCSSで切り抜いて見せる。
// 縦長の画像から、説明したい部分だけを判読できる大きさで見せる役割
export function ScreenShot({ src, alt, width, height, cropTop = 0, cropBottom = height, lazy }: ScreenShotProps) {
	const visible = cropBottom - cropTop;
	// 切り抜き窓の縦横比と、object-positionの縦位置(%)を計算する
	const ratio = width / visible;
	const position = visible >= height ? 0 : (cropTop / (height - visible)) * 100;

	return (
		<img
			className={styles.shot}
			src={src}
			alt={alt}
			width={width}
			height={height}
			loading={lazy ? "lazy" : undefined}
			style={{ aspectRatio: ratio, objectPosition: `50% ${position}%` }}
		/>
	);
}
