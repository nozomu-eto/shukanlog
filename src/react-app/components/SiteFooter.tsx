import { Link } from "react-router";
import styles from "./SiteFooter.module.css";

// サイト共通の案内リンクと著作権表記を表示し、どの画面からも規約等へ移動できるようにする
export function SiteFooter() {
	return (
		<footer className={styles.footer}>
			<nav aria-label="サイト情報" className={styles.footerNav}>
				<Link to="/terms" className={styles.footerLink}>
					利用規約
				</Link>
				<Link to="/privacy" className={styles.footerLink}>
					プライバシーポリシー
				</Link>
				<Link to="/licenses" className={styles.footerLink}>
					ライセンス
				</Link>
				<Link to="/contact" className={styles.footerLink}>
					お問い合わせ
				</Link>
			</nav>
			<p className={styles.copyright}>© 2026 shukanlog</p>
		</footer>
	);
}
