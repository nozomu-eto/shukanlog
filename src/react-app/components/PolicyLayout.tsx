import type { ReactNode } from "react";
import { UnauthHeader } from "./UnauthHeader";
import { PageTitle } from "./PageTitle";
import styles from "./PolicyLayout.module.css";

interface PolicyLayoutProps {
	title: string;
	establishedDate: string;
	revisedDate?: string;
	children: ReactNode;
}

// 利用規約・プライバシーポリシー・ライセンス共通のページの枠(見出し・本文の読みやすい幅)。
// 目次は無し。ログイン・未ログインどちらからも開けるため、未ログイン向けの共通ヘッダーを使う
export function PolicyLayout({ title, establishedDate, revisedDate, children }: PolicyLayoutProps) {
	return (
		<div className={styles.page}>
			<PageTitle title={title} />
			<UnauthHeader />
			<main className={styles.main}>
				<article className={styles.article}>
					<h1 className={styles.title}>{title}</h1>
					<p className={styles.dates}>
						制定日:{establishedDate}
						{revisedDate ? `／最終改定日:${revisedDate}` : null}
					</p>
					<div className={styles.body}>{children}</div>
				</article>
			</main>
		</div>
	);
}
