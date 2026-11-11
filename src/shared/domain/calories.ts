// 平均カロリーだけを四捨五入して桁区切りにする
// 週・月タブで表示形式をそろえ、日別の記録値には影響させない
export function formatAverageCalories(value: number): string {
	return Math.round(value).toLocaleString("ja-JP");
}
