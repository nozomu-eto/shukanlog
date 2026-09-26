import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";
import styles from "./UnauthHeader.module.css";

interface UnauthHeaderProps {
	// 戻る矢印を表示する場合、戻り先(例: "/"、"/signup")
	backTo?: string;
	// 右側に「ログイン」リンクを表示するか(トップページのみtrue)
	showLogin?: boolean;
}

// 未ログイン向けの画面共通のヘッダー。サービス名のみ、または「ログイン」リンク付き。
// docs/design/mockups/Top.dc.html・Login.dc.html等に合わせている
export function UnauthHeader({ backTo, showLogin }: UnauthHeaderProps) {
	return (
		<header className={styles.header}>
			<div className={styles.brand}>
				{backTo ? (
					<Link to={backTo} aria-label="戻る" className={styles.back}>
						<ChevronLeft size={20} aria-hidden="true" />
					</Link>
				) : null}
				<span className={styles.serviceName}>shukanlog</span>
			</div>
			{showLogin ? (
				<Link to="/login" className={styles.loginLink}>
					ログイン
				</Link>
			) : null}
		</header>
	);
}
