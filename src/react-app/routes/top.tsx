import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { authClient } from "../lib/auth-client";
import { UnauthHeader } from "../components/UnauthHeader";
import { Button } from "../components/Button";
import { Legend } from "../components/Legend";
import { ScreenShot } from "../components/ScreenShot";
import { StatusIcon, type Status } from "../components/StatusIcon";
import dayImage from "../assets/lp/day.png";
import weekImage from "../assets/lp/week.png";
import monthImage from "../assets/lp/month.png";
import styles from "./top.module.css";

// 画像の元サイズ(px)。切り抜き範囲(cropTop〜cropBottom)も元画像のピクセルで指定する
const DAY = { src: dayImage, width: 780, height: 1632 };
const WEEK = { src: weekImage, width: 780, height: 2496 };
const MONTH = { src: monthImage, width: 780, height: 1992 };

// 利用者の悩み(セクション2)
const PROBLEMS = [
	{
		title: "薬を飲んだか、後から思い出せない",
		body: [
			"毎日繰り返すことほど、昨日や一昨日に実施したかどうかが曖昧になることがあります。",
			"その日のうちに記録を残しておけば、後から確認できます。",
		],
	},
	{
		title: "少し運動できた日も、記録しておきたい",
		body: [
			"予定していた運動を全部はできなくても、少しだけ体を動かせた日があります。",
			"「できた・できなかった」の2択だけでは、こうした違いを残せません。",
		],
	},
	{
		title: "1週間を振り返ると、何ができたか分からない",
		body: [
			"毎日を過ごしていると、服薬や運動の状況をまとめて思い出すのは難しいものです。",
			"日ごとの記録を一覧で確認できれば、どの日に何ができたかを振り返れます。",
		],
	},
];

// 使い方(セクション8)
const STEPS = [
	{
		title: "アカウントを登録",
		body: ["メールアドレスとパスワードを登録します。", "メールで届く確認コードを入力して、メールアドレスを確認します。"],
	},
	{
		title: "今日の状況を選んで記録",
		body: [
			"服薬は◯・×、運動は◯・△・×から、その日の状況に合うものを選びます。",
			"記録した内容は後から確認・変更できます。",
		],
	},
	{
		title: "週・月で振り返る",
		body: [
			"日々の記録がたまったら、週や月の画面で実施状況を確認します。",
			"できた日だけでなく、できなかった日や未記録の日も振り返れます。",
		],
	},
];

// 日・週・月の振り返り(セクション6)。サムネイルとして見せる範囲を画像ごとに指定する
const REVIEWS = [
	{
		title: "日ごとの記録を確認",
		body: ["その日の服薬や運動の状況を確認できます。", "記録内容を変更したい場合は、状態を選び直すこともできます。"],
		caption: "日ごとの記録画面",
		image: DAY,
		alt: "日タブの画面。服薬・運動・カロリーの記録が日ごとに表示されている",
		cropTop: 0,
		cropBottom: 1300,
	},
	{
		title: "週単位で確認",
		body: ["1週間の記録を曜日ごとに並べて確認できます。", "どの日にできたか、少しだけできたか、できなかったかを見比べられます。"],
		caption: "週単位の振り返り画面",
		image: WEEK,
		alt: "週タブの画面。11/16(月)〜11/22(日)の服薬・運動の記録が曜日ごとに並んでいる",
		cropTop: 0,
		cropBottom: 1550,
	},
	{
		title: "月単位で確認",
		body: ["月のカレンダーから、日ごとの記録を振り返れます。", "毎日の記録をまとめて確認したい場合に利用できます。"],
		caption: "月単位の振り返り画面",
		image: MONTH,
		alt: "月タブの画面。2026年11月のカレンダーの各日に、服薬・運動の記号とカロリーが表示されている",
		cropTop: 240,
		cropBottom: 1700,
	},
];

// 「できなかった」と「記録していない」の違いを見せる説明用の例(セクション5)
const COMPARE: { title: string; status: Status; label: string; note: string }[] = [
	{ title: "運動を「できなかった」と記録した日", status: "not_completed", label: "×(未達成)", note: "記録済み" },
	{ title: "運動について何も入力していない日", status: null, label: "空欄(未記録)", note: "まだ記録していない" },
];

function Section({
	id,
	heading,
	tone,
	children,
}: {
	id: string;
	heading: ReactNode;
	tone?: "surface" | "accent";
	children: ReactNode;
}) {
	const toneClass = tone === "surface" ? styles.surface : tone === "accent" ? styles.accent : "";
	return (
		<section aria-labelledby={id} className={[styles.band, toneClass].join(" ")}>
			<div className={styles.inner}>
				<h2 id={id} className={styles.h2}>
					{heading}
				</h2>
				{children}
			</div>
		</section>
	);
}

// 主ボタン「無料ではじめる」と補助リンク「ログイン」。ファーストビューと最終CTAで共通
function Actions() {
	return (
		<div className={styles.actions}>
			<Button to="/signup">無料ではじめる</Button>
			<Button to="/login" variant="secondary">
				ログイン
			</Button>
		</div>
	);
}

// 記号+ラベルの1行(選択肢の説明用。ボタンに見えない静的な表示)
function Option({ status, label, text }: { status: Exclude<Status, null>; label: string; text: string }) {
	return (
		<li className={styles.option}>
			<StatusIcon status={status} size={24} />
			<span>
				<strong>{label}</strong>：{text}
			</span>
		</li>
	);
}

// トップページ(/)。ログイン前の利用者向けのLP。
// ログイン済みの状態でこのページを開いた場合は/appへ移動する
export function TopRoute() {
	const { data: session, isPending } = authClient.useSession();
	const location = useLocation();
	// 退会の完了直後に、見出しの上に表示するメッセージ(react-routerのstate経由)
	const completionMessage = (location.state as { message?: string } | null)?.message;

	if (isPending) {
		return null;
	}
	if (session) {
		return <Navigate to="/app" replace />;
	}

	return (
		<div className={styles.page}>
			<UnauthHeader showLogin />
			<main className={styles.main}>
				{/* 1. ファーストビュー */}
				<div className={styles.band}>
					<div className={[styles.inner, styles.hero].join(" ")}>
						{completionMessage ? (
							<div role="status" className={styles.statusBanner}>
								{completionMessage}
							</div>
						) : null}
						<div className={styles.heroText}>
							<h1 className={styles.heading}>
								服薬・運動を記録して、
								<br />
								週・月でふりかえる。
							</h1>
							<div className={styles.lead}>
								<p>毎日の服薬や運動を、かんたんに記録。</p>
								<p>
									<strong>shukanlogは、日々の実施状況をボタンで記録し、後から振り返るためのWebサービスです。</strong>
								</p>
								<p>服薬は「飲んだ・飲まなかった」の2択。運動は「できた・少し・できなかった」の3択。</p>
								<p>その日の状況を選ぶだけで、日・週・月単位の記録を残せます。</p>
								<p>カロリー記録は、必要な方だけ利用できます。</p>
							</div>
							<Actions />
						</div>
						<figure className={[styles.figure, styles.heroFigure].join(" ")}>
							<ScreenShot
								{...DAY}
								cropTop={130}
								cropBottom={1300}
								alt="日ごとの記録画面。服薬は「できた」「できなかった」、運動は「できた」「少し」「できなかった」から選べ、その下にカロリーの記録欄がある"
							/>
							<figcaption>日ごとの記録画面</figcaption>
						</figure>
					</div>
				</div>

				{/* 2. 利用者の悩み */}
				<Section id="problems" heading="毎日の健康習慣、こんなことはありませんか？" tone="surface">
					<ul className={styles.cards}>
						{PROBLEMS.map((p) => (
							<li key={p.title} className={styles.card}>
								<h3 className={styles.h3}>{p.title}</h3>
								{p.body.map((t) => (
									<p key={t}>{t}</p>
								))}
							</li>
						))}
					</ul>
				</Section>

				{/* 3. 解決策(画像なし) */}
				<Section id="solution" heading="日々の実施状況を、無理なく記録できる形に。">
					<div className={styles.prose}>
						<p>shukanlogでは、服薬と運動の違いに合わせて、記録方法を分けています。</p>
						<p>服薬は飲んだかどうかを記録する2択。</p>
						<p>運動は、少しだけ実施できた日も残せる3択。</p>
						<p>
							<strong>記録する内容に合わせて選択肢を絞り、毎日の入力をシンプルにしました。</strong>
						</p>
					</div>
				</Section>

				{/* 4. 服薬2択・運動3択 */}
				<Section id="choices" heading="服薬は2択、運動は3択。" tone="surface">
					<div className={styles.split}>
						<figure className={styles.figure}>
							<ScreenShot
								{...DAY}
								cropTop={410}
								cropBottom={930}
								lazy
								alt="日ごとの記録画面の拡大。服薬の「できた」「できなかった」、運動の「できた」「少し」「できなかった」のボタンが並び、運動は「できた」が選択されている"
							/>
							<figcaption>日ごとの記録画面（服薬・運動の部分）</figcaption>
						</figure>
						<div className={styles.explain}>
							<div>
								<h3 className={styles.h3}>服薬｜◯・×</h3>
								<ul className={styles.options}>
									<Option status="completed" label="◯" text="薬を飲んだ日（画面の表示は「できた」）" />
									<Option status="not_completed" label="×" text="飲まなかった日（画面の表示は「できなかった」）" />
								</ul>
								<p>その日の服薬の有無を記録します。中間の選択肢は設けず、2択で選べるようにしています。</p>
							</div>
							<div>
								<h3 className={styles.h3}>運動｜◯・△・×</h3>
								<ul className={styles.options}>
									<Option status="completed" label="◯" text="目標どおりに運動できた日（「できた」）" />
									<Option status="partial" label="△" text="少しだけ実施できた日（「少し」）" />
									<Option status="not_completed" label="×" text="実施できなかった日（「できなかった」）" />
								</ul>
								<p>運動量には日によって違いがあるため、部分的な達成も記録できます。</p>
							</div>
							<div className={styles.note}>
								<h3 className={styles.h3}>間違えた記録は取り消せます</h3>
								<p>
									選択中のボタンをもう一度押すと、その日の記録を取り消して未記録の状態に戻せます。入力を間違えた場合にも操作できます。
								</p>
							</div>
						</div>
					</div>
				</Section>

				{/* 5. 1週間の記録例と未記録の説明 */}
				<Section id="week-example" heading="1週間の記録は、こんなふうに確認できます">
					<h3 className={styles.h3Lead}>1週間の記録画面</h3>
					<div className={styles.split}>
						<figure className={styles.figure}>
							<ScreenShot
								{...WEEK}
								cropTop={390}
								cropBottom={1550}
								lazy
								alt="週タブの画面。11/16(月)〜11/22(日)の各日に、服薬・運動の記録が並んでいる。月曜は服薬◯・運動△、火曜は運動のみ◯で服薬は空欄、水曜以降は「未来の日」と表示されている"
							/>
							<figcaption>
								週単位の振り返り画面。曜日ごとの服薬・運動の記録を確認できます
								<br />
								<a href={weekImage} target="_blank" rel="noreferrer">
									画像全体を別タブで開く
								</a>
							</figcaption>
						</figure>
						<div className={styles.explain}>
							<div>
								<h3 className={styles.h3}>記号の説明</h3>
								<Legend />
								<p className={styles.small}>
									※画面の例はサービスの表示方法を説明するためのものです。実際の利用者の記録ではありません。
								</p>
							</div>
							<div>
								<h3 className={styles.h3}>「できなかった」と「記録していない」は別の状態</h3>
								<p>
									例えば、水曜日に運動しなかった場合は「×」を選んで記録できます。
									一方、その日の運動について何も入力していない場合は、未記録のままです。
								</p>
								<ul className={styles.compare} aria-label="説明用の例">
									{COMPARE.map((c) => (
										<li key={c.title} className={styles.compareItem}>
											<span className={styles.compareTitle}>{c.title}</span>
											<span className={styles.compareRow}>
												<span className={styles.habitName}>運動</span>
												<span className={styles.compareCell}>
													<StatusIcon status={c.status} size={22} />
												</span>
												<span>{c.label}</span>
											</span>
											<span className={styles.small}>{c.note}</span>
										</li>
									))}
								</ul>
								<p>
									<strong>入力がないことを、自動的に「できなかった」とは扱いません。</strong>
									実施できなかった日も、記録を忘れた日も、区別して確認できます。
								</p>
							</div>
						</div>
					</div>
				</Section>

				{/* 6. 日・週・月の振り返り */}
				<Section id="review" heading="日・週・月で、記録を振り返る。" tone="surface">
					{/* スマートフォンでは横スクロール。キーボードでもスクロールできるようtabIndexを付ける */}
					{/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- 横スクロール領域をキーボードで操作できるようにするため */}
					<div className={styles.reviewScroll} role="region" aria-label="日・週・月の画面の比較" tabIndex={0}>
						{REVIEWS.map((r) => (
							<figure key={r.title} className={styles.reviewItem}>
								<ScreenShot
									{...r.image}
									cropTop={r.cropTop}
									cropBottom={r.cropBottom}
									lazy
									alt={r.alt}
								/>
								<figcaption>
									<span className={styles.h3}>{r.title}</span>
									{r.body.map((t) => (
										<span key={t} className={styles.captionText}>
											{t}
										</span>
									))}
									<span className={styles.small}>{r.caption}</span>
								</figcaption>
							</figure>
						))}
					</div>
				</Section>

				{/* 7. カロリー記録 */}
				<Section id="calorie" heading="カロリー記録は、必要な方だけ。">
					<div className={styles.split}>
						<div className={styles.prose}>
							<p>shukanlogでは、服薬や運動に加えて、食事のカロリーも記録できます。</p>
							<p>カロリーの記録が必要ない場合は、設定からオフにできます。</p>
							<p>使わない項目の入力を求められることなく、自分に必要な記録に合わせて利用できます。</p>
						</div>
						<figure className={styles.figure}>
							<ScreenShot
								{...DAY}
								cropTop={925}
								cropBottom={1290}
								lazy
								alt="日ごとの記録画面のカロリー欄。「記録する」ボタンと、その日の合計531kcal、食事の内訳が表示されている"
							/>
							<figcaption>カロリーの記録画面</figcaption>
						</figure>
					</div>
				</Section>

				{/* 8. 3ステップの使い方 */}
				<Section id="steps" heading="はじめ方は3ステップ" tone="surface">
					<ol className={styles.cards}>
						{STEPS.map((s, i) => (
							<li key={s.title} className={styles.card}>
								<span className={styles.stepNumber}>STEP {i + 1}</span>
								<h3 className={styles.h3}>{s.title}</h3>
								{s.body.map((t) => (
									<p key={t}>{t}</p>
								))}
							</li>
						))}
					</ol>
				</Section>

				{/* 9. 最終CTA */}
				<Section id="final-cta" heading="今日の状況を、記録するところから。" tone="accent">
					<div className={styles.prose}>
						<p>薬を飲んだ日も、飲まなかった日も。</p>
						<p>運動ができた日も、少しだけできた日も。</p>
						<p>その日の状況を記録しておけば、後から確認できます。</p>
						<p>
							<strong>shukanlogで、今日の記録を始めてみませんか？</strong>
						</p>
					</div>
					<Actions />
				</Section>
			</main>
		</div>
	);
}
