import { PageTitle } from "../components/PageTitle";
import { UnauthHeader } from "../components/UnauthHeader";
import styles from "./contact.module.css";

// 認証なしで問い合わせ先を確認できるように、連絡先だけを案内する
export function ContactRoute() {
	return (
		<div className={styles.page}>
			<PageTitle title="お問い合わせ" />
			<UnauthHeader />
			<main className={styles.main}>
				<article className={styles.article}>
					<h1 className={styles.title}>お問い合わせ</h1>
					<p className={styles.description}>
						shukanlogに関するお問い合わせは、以下のメールアドレスまでご連絡ください。
					</p>
					<p className={styles.email}>info@shukanlog.com</p>
				</article>
			</main>
		</div>
	);
}
