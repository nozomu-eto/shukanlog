import { Outlet } from "react-router";
import { SiteFooter } from "./SiteFooter";
import styles from "./SiteLayout.module.css";

// 全ページの表示領域を共通化し、短い画面でもフッターを画面下端に配置する
export function SiteLayout() {
	return (
		<div className={styles.page}>
			<div className={styles.content}>
				<Outlet />
			</div>
			<SiteFooter />
		</div>
	);
}
