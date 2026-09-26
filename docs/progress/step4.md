# ステップ4 進捗管理

## T0: 作業前の準備

- [x] git status確認(未コミットの変更なし。stash不要)
- [x] git fetch origin → origin/main が ステップ3の内容(docs/progress/step3.md、src/react-app/routes/app/day-tab.tsx)と、wrangler.jsonのcompatibility_dateが2026-08-18であることを確認
- [x] feat/ui-settings ブランチを作成(origin/main から)
- [x] docs/progress/step4.md を作成

## タスク一覧

- [x] T1: compatibility_date のルールを直す
- [x] T2: 記録の楽観的更新を公式の書き方に揃える
- [x] T3: 期間の移動の共通部品
- [x] T4: 週タブ
- [x] T5: 月タブ
- [x] T6: 日週月の切り替えの確認
- [x] T7: 設定画面(/app/settings)
- [x] T8: メールアドレスの変更(/app/settings/email)
- [x] T9: パスワードの変更(/app/settings/password)
- [x] T10: 退会の仕組み(サーバー)
- [x] T11: 退会の画面(/app/settings/withdraw)
- [x] T12: 退会から30日後の完全削除(定期処理)
- [ ] T13: メール未確認ユーザーの削除(定期処理)
- [ ] T14: 利用規約・プライバシーポリシーのページ(/terms、/privacy)
- [ ] T15: ライセンスのページ(/licenses)
- [ ] T16: 旧資料の片付け
- [ ] T17: 画面の動作確認
- [ ] T18: ドキュメント
- [ ] T19: ステップ5への持ち越し
- [ ] T20: PRの作成

## 判断ログ

### T0

- git status確認: 未コミットの変更なし。stash不要
- `git fetch origin` 後、origin/main(5ca5c0d)に docs/progress/step3.md・src/react-app/routes/app/day-tab.tsx が含まれること、wrangler.json の compatibility_date が 2026-08-18 であることを確認した
- `git checkout -b feat/ui-settings origin/main` でブランチを作成した(worktreeの制約は今回発生しなかった)

### T1

- AGENTS.md・docs/architecture.md・wrangler.jsonのコメントを、「compatibility_dateは2026-03-03以降、かつpnpm devの実行環境が対応している日付にする(依存パッケージ更新時に上げてよい)」「動作確認はpnpm devで行う」に直した。現在の値(2026-08-18)はpnpm devで起動できることを確認済みのため変更していない
- docs/progress/step3.mdのT11のチェックボックスを[x]に直した(判断ログには記載済みだったが付け忘れていた)

### T2

- day-tab.tsxのhandlePick(記録の保存)を、素朴なasync関数+try/catchから`useMutation`(onMutate→onError→onSettled)に置き換えた。onMutateで`cancelQueries`してから楽観的更新をすることで、画面に戻った際の再取得(refetchOnWindowFocus)がすでに進行中の場合でも、その古い取得結果で楽観的更新が上書きされないようにした
- 連続操作への対応は、ドキュメント(TanStack Queryのscopeの説明)を確認したうえで2つを組み合わせた
  - `scope: { id: "habit-log" }` で、実際の保存(PUT)自体を発生順に1つずつ実行させる(サーバー側の最終状態も、最後にクリックした操作と一致させるため)
  - scopeは`mutationFn`の実行だけを直列化し、各mutationの`onMutate`/`onError`自体の実行順は保証しない(ソース上、`onMutate`は`mutate()`呼び出し時点で即時実行される)ため、scopeだけでは「古い操作が後から失敗した際のロールバックが、すでに反映されている新しい操作の楽観的更新を消してしまう」可能性が残る。そのため、習慣ごとに直近の操作の連番を`useRef`で持ち、ロールバックは「この操作より後に、同じ習慣への操作が始まっていない場合」だけ行うようにした(習慣ごとに最新の操作だけを反映する、の考え方)
- テスト(day-tab.test.tsx)に、保存中に画面に戻ったこと等による再取得が重なっても押した状態が保たれること、同じ習慣への連続操作(2回目の後に1回目が失敗)で2回目の状態が残ることの2つを追加した。テストのモックは、実際のサーバーと同様に保存内容を反映するようにし(invalidateQueriesによる再取得が現実的な値を返すようにする)、フリー放置される`getDayMock`が常に初期状態を返すことで発生する誤検知を避けた

### T3

- `src/shared/domain/period.ts`の`PeriodUnit`に`"day"`を追加し、`getPreviousPeriodDate`・`getNextPeriodDate`がdayのときは1日ずつ移動するようにした。日タブを「start===endの1日だけの期間」として扱えば、`canGoToNextPeriod`・`canReturnToToday`(DateRangeを受け取る既存の関数)もそのまま使えるため、`getPeriodRange(date, unit)`(day→{start:date,end:date}、week/month→既存の関数)を追加してdate単体から範囲を作れるようにした
- 期間の移動のUI(前へ・見出し(h1)・次へ・今日に戻る)を`src/react-app/components/PeriodNav.tsx`(+`PeriodNav.module.css`)に抽出した。前後の移動先・可否の計算はperiod.tsの関数を使い、呼び出し側(各タブ)がhrefを組み立てて渡す設計にした(部品自体はページ内の状態やAPIを持たない)
- 今日を含む期間のときの表示(日タブは「今日」ラベル、週・月タブは何も表示しない)を`todayLabel`propの有無で切り替えられるようにした(todayHrefがnullのときのフォールバック)
- 日タブ(day-tab.tsx)をPeriodNavに置き換え、ステップ3のテスト(day-tab.test.tsx)がすべて通ることを確認した。period.test.tsにday単位のテストを追加した

### T4

- 週タブのレイアウトは、AGENTS.mdの「DOMの親子構造を条件分岐で変えず、CSS Gridのgrid-template-areasで配置だけを切り替える」方針(app-shell.tsx参照)に揃えた。1つのグリッドコンテナ(nav/habits/calorie/legendの4領域)を用意し、スマホは縦1列(nav→habits→calorie→legend)、PC(1024px以上)は2列(左7:右5、1行目がnav+legend、2行目がhabits+calorie)にgrid-template-areasだけを切り替えた
- 週・月タブ共通の凡例(Legend.tsx)を切り出した(達成・一部達成・未達成・空欄未記録の4項目で、両タブで内容が同一のため)
- 日・週・月タブ間のURL組み立て(`/app?tab=...&date=...`)をsrc/react-app/lib/tab-links.tsのhrefForTabに共通化し、day-tab.tsxのhrefForDateもこれを使うように直した
- 集計はGET /api/summary(既にステップ2で実装済み)を使い、期間はsrc/shared/domain/periodのgetWeekRangeで算出する。各マスの読み上げラベルは、未来の日は「9月26日 未来の日」、それ以外は「9月23日 服薬 未達成」(week-month-tabs.md 1.7)とし、getStatusLabel(StatusIconから export済み)を再利用した
- カロリーの棒グラフの高さは、期間内の最大値を基準にした比率(最大80px、最小4px)で計算する実装にした(モックアップは固定の除数2200を使っていたが、値の大きさに応じて相対的に見やすくなるよう期間内最大値基準にした判断)
- テスト(week-tab.test.tsx)では、todayInTokyo()が実行環境の現在時刻に依存するため、src/shared/domain/dateをvi.mockして「今日」を2026-09-24に固定した(fakeTimersはreact-queryの内部タイマーやwaitForのポーリングと干渉してテストがタイムアウトしたため、todayInTokyoの部分モックに変更した)

### T5

- PC(1024px以上)の右カラム(マスの見方・服薬・運動・平均カロリー・凡例)は、モックアップ上は1本の縦並びだが、モバイルでは「マスの見方」の説明はカレンダーカード内の見出し行(cellLegendHint)、服薬・運動・平均カロリーは3列(カロリー無効時2列)のグリッド、凡例は別カードという構成で、DOM構造自体が異なって見える。AGENTS.mdの「DOMの親子構造を条件分岐で変えない」方針を保つため、両方の要素(cellLegendHintとhintCard)を常にDOMに置き、CSSの`display:none`/`display:contents`の切り替えだけでモバイル/PCの見た目を作った(hintCardはモバイルで非表示、cellLegendHintはPCで非表示、summaryのgrid-template-columnsはPCで`display:contents`にして`.side`のflexカラムに合流させる)
- カロリーの桁区切り(スマホはなし・PCはあり)も同様に、両方の文字列を常にレンダリングし、CSSで出し分ける(mobileOnly/pcOnlyクラス)実装にした
- マスの読み上げラベルは、月タブの仕様(week-month-tabs.md 1.7)の「9月3日 服薬 達成 運動 一部達成 1950kcal」「カロリー記録なし」「未来の日」の3パターンをそのまま実装した。カロリー記録が無効な利用者にはkcal部分を付けない(カロリー自体を出さないため、記録なしとも言わない)
- 月間サマリーの分母(eligibleDays)・平均カロリーはGET /api/summaryのtotalsをそのまま使う。服薬(2段階)は◯の数のみ、運動(3段階)は◯△の数を表示する(week-month-tabs.md 3.3)
- テスト(month-tab.test.tsx)は、2026年2月(1日が日曜)を「今日」に固定して、月曜始まりのカレンダーの空欄マス数(前月分6+翌月分1=7)、未来のマスがリンクでないこと、カロリー無効時の表示(マスにkcalが出ない、説明が「左:服薬 右:運動」になる)を確認した

### T6

- 確認の過程で2つの不具合を見つけて修正した
  1. 週・月タブのマスから日タブへのリンクが、react-routerの`Link`ではなく生の`<a href>`になっていた(T4・T5実装時の書き忘れ)。生の`<a>`だとブラウザのフルページ遷移になり、SPAとしての遷移(react-router側でのクライアントサイド遷移)にならないため、両タブとも`Link`に直した
  2. 日タブで記録(習慣の保存・カロリーの保存)をしても、react-queryの`["summary", from, to]`キャッシュを無効化していなかったため、記録直後に週・月タブを開いても古い集計が表示され続ける(再度画面をリロードするまで反映されない)問題があった。day-tab.tsxのpickMutationのonSettled・handleCalorieSavedの両方に`queryClient.invalidateQueries({ queryKey: ["summary"] })`を追加した(fromToを問わず前方一致で無効化する)
- テストを追加した: app-shell.test.tsx(日週月の切り替えでdateクエリパラメータが保持されること、aria-current)、day-tab.test.tsx(記録の保存でsummaryクエリのキャッシュが無効化されること)。週・月タブから日タブへのリンク(Linkのhref)は既存のweek-tab.test.tsx・month-tab.test.tsxのテストでも確認できている

### T7

- docs/design/mockups/Settings.dc.htmlはスマホでは「戻る」+ページ名のヘッダー、docs/design/mockups/SettingsPC.dc.htmlではPCは通常のAppShellのヘッダー(ブランド・日週月・設定リンク、設定リンクを選択中の見た目にする)だった。設定画面とそのサブページ(メール・パスワード変更、退会)をAppShellの外に出す(レイアウトを作り直す)のではなく、AppShell自身がlocation.pathnameで設定系のページかどうかを判定し、スマホ向けの「戻る」ヘッダーとPC向けの通常ヘッダーの両方をDOMに用意してCSSの表示切り替え(display:none)で出し分ける実装にした(AGENTS.mdの「DOMの親子構造を条件分岐で変えない」方針を維持するため。ページごとの戻り先・見出しはAppShell内の小さな対応表で管理する)
- カロリー記録のスイッチはrole="switch"・aria-checked・aria-labelledbyで実装し、PATCH /api/profileの成功時に["me"](スイッチの表示元)・["day"]・["summary"](カロリーの表示先)のキャッシュを無効化して、日・週・月タブに即時反映されるようにした
- ログアウトはT3(ステップ3)の仮実装をそのまま流用した(確認なしで実行し、ログイン画面に「ログアウトしました」を表示)
- 利用規約・プライバシーポリシーへのリンクはモックアップ通りreact-routerのLink(target="_blank")、お問い合わせはmailto:のaタグ、退会への導線はLinkにした
- 「入力欄の枠線」等には無い#C9C8C1(退会ボタンの枠線・スイッチのオフ状態の地の色)を、styles/tokens.cssに`--color-border-strong`として追加した(docs/design.mdの色の表に無いが、モックアップに実在する色のため)

### T8

- node_modules内のBetter Auth(1.7.6)のソース(plugins/email-otp/routes.mjs)を確認し、`requestEmailChangeEmailOTP`(`POST /email-otp/request-email-change`)には現在のパスワードを確認する仕組みが無い(`verifyCurrentEmail`はOTPで現在のメールアドレス側を確認するオプションで、パスワードとは無関係)ことと、変更先のメールアドレスが既に使われている場合は「存在の漏えい防止」のため確認コードを送らずに黙って`success:true`を返す(エラーにならない)ことを確認した。仕様(T8)では現在のパスワードの確認と「既に使われている」ことの明示的なエラー表示が必要なため、Better Auth本体を呼ぶ前にこの2つを独自に検証するサーバーの関数(`src/worker/routes/account.ts`の`requestEmailChange`)を追加し、`POST /api/account/email/request-change`として公開した
- 現在のパスワードの確認は、公開APIとして用意されていなかったため「適切な方法が無い場合」に該当すると判断し、Better Auth自身のchange-password処理(`api/routes/update-user.mjs`)が使っているのと同じ内部処理(`ctx.internalAdapter.findCredentialAccount` + `ctx.password.verify`、`auth.$context`経由でアクセス可能なことを型定義(`@better-auth/core`のAuthContext)で確認した)を使う`src/worker/auth/verify-password.ts`を追加した。T10(退会)でも同じ関数を再利用する
- コードの確認・変更の確定(`POST /email-otp/change-email`)自体は、独自の検証が不要なためBetter Authの標準エンドポイントをフロントエンドから直接呼び出す(`authClient.emailOtp.changeEmail()`)。この呼び出しは通常のfetch(Cookie送受信付き)を経由するため、成功時にBetter Auth側が発行するセッションの更新(新しいメールアドレスを反映したCookie)がそのままブラウザに反映される。これにより、サーバー側で新しいSet-Cookieを手動で転送する実装(`auth.api.X()`をasResponse付きで呼び出しCookieを付け替える等)を避けられた
- 確認コードの送信は、書き込み全般用のAPI_RATE_LIMITER(60秒60回)では粗すぎる(既知の落とし穴5と同じ考え方、Better Auth側の確認コード送信customRulesは60秒に1回)ため、専用のWorkers Rate Limitingバインディング`EMAIL_CHANGE_RATE_LIMITER`(60秒に1回)を追加した
- テスト(test/worker/account-email-change.test.ts)は、誤ったパスワードでは送信されない、既に使われているメールアドレスでは送信されずエラーになる、確認前は`GET /api/me`が元のメールアドレスのままで確認後に変わる、変更後は新しいメールアドレスでログインでき古いメールアドレスではログインできないことを確認した。`POST /api/auth/email-otp/change-email`の直接呼び出しにはOriginヘッダーが必須(Better Auth側のCSRF対策、BETTER_AUTH_URLと一致する必要がある)であることがテスト実行時のエラーから分かったため、テストのfetchにも付けた

### T9

- Better Auth本体(プラグインではなくコア)に`POST /change-password`(`authClient.changePassword`)が既に用意されており、`currentPassword`・`newPassword`・`revokeOtherSessions`を渡せることをソース(api/routes/update-user.mjs)で確認した。`revokeOtherSessions: true`にすると、内部で対象利用者の全セッション(呼び出し中の現在のセッションを含む)を削除したうえで、その場で新しいセッションを1つ発行し直す実装だった(`deleteUserSessions`→`createSession`→`setSessionCookie`)。そのため「ほかの端末を無効にしつつ今の端末はログインしたまま」は、この呼び出し自体のレスポンスが返す新しいCookieがブラウザにそのまま反映されることで実現される(サーバー側で個別に古いセッションだけを選んで消す実装は不要だった)
- 現在のパスワードが誤っている場合は`INVALID_PASSWORD`(Better Auth本体のBASE_ERROR_CODES)が返るため、T6で使ったものと同じ`getAuthErrorCode()`で判定した
- 画面(settings-password.tsx)はdocs/design/mockups/PasswordChange.dc.html・PasswordChangePC.dc.htmlの2ステップ(入力→完了)構成をそのまま実装した
- テスト(test/worker/account-password-change.test.ts)は、同じ利用者で2つ目のセッション(別端末を想定)を作ってから変更し、他の端末のセッションが無効になること・今の端末は変更時の新しいCookieでログインしたままなこと・新しいパスワードでログインできて古いパスワードでは失敗することを確認した。フロントエンドのテスト(settings-password.test.tsx)はauthClientをモックし、revokeOtherSessions:trueで呼び出されること・エラー表示を確認した

### T10

- 退会の申請を記録するテーブル`account_deletion`(user_id、requested_at、purge_after、canceled_at)を追加し、マイグレーション(0003)を生成した
- `POST /api/account/withdraw`は、T8・T9で使ったのと同じ`verifyCurrentPassword`(Better Auth本体のパスワード照合処理)で現在のパスワードを確認したうえで、`account_deletion`に1行追加し(purge_afterは申請から30日後)、Better Authの`internalAdapter.deleteUserSessions(userId)`でその利用者のすべてのセッションを無効にする(即時ログアウト)。データそのものはこの時点では削除しない
- ログイン時の取り消しは、Better Authの`databaseHooks.session.create.after`フック(セッションが新規作成されるたびに呼ばれる)で実装した。ログイン(`/sign-in/email`)以外(パスワード変更時の再発行等)でも呼ばれるが、`cancelPendingWithdrawal`は「取り消されておらず、まだ物理削除の期限を過ぎていない申請」が無ければ何もしないため問題ない
- 新規登録で退会申請中の同じメールアドレスを使った場合は、そのユーザーの行自体をまだ削除していない(物理削除は定期処理(T12)まで行わない)ため、Better Auth本体の既存の「登録済み」エラー(USER_ALREADY_EXISTS)がそのまま返る。画面の文言で「取り消すにはログインするよう」案内するのはT11で行う
- `GET /api/me`に`justCanceledWithdrawal`(直前10分以内に取り消された場合true)を追加した。「1回だけ表示する」という要件は、サーバー側で時間窓(10分)を設けるところまでを担い、実際に1回だけ見せる制御(表示済みかどうかの記録)はクライアント側(T11)に委ねる方針にした
- テスト(test/worker/account-withdraw.test.ts)は、退会でセッションが無効になりデータ(userの行)は残ること、誤ったパスワードでは退会できないこと、30日以内に同じメールアドレス・パスワードでログインすると取り消されGET /api/meのjustCanceledWithdrawalで分かることを確認した

### T11

- 退会自体の説明(3項目)とパスワード入力を経ているこの画面では、「退会する」ボタン自体が最終確認を兼ねると判断し、追加の確認ダイアログは重ねなかった(design.md 6章の「取り消せない操作のボタン」は退会するボタン自体がそれに該当する)
- 成功後は、サーバー側で全セッションを無効化済みだが、クライアント側のBetter Authのセッションキャッシュが残っているとトップページ(/)がログイン済みと判定して/appへ戻してしまうため、`authClient.signOut()`を呼んでからトップページへ`state`でメッセージを渡して移動するようにした。トップページ(top.tsx)に、ログイン画面と同様の`location.state.message`表示(`role="status"`のバナー)を追加した
- 「/appでトーストを1回だけ表示する」は、日週月タブの入り口であるTabsRoute(tabs.tsx)にGET /api/me(既にday-tab等でも使っているキャッシュキー`["me"]`)を見て、`justCanceledWithdrawal`がtrueならトーストを表示する実装にした。「1回だけ」は、ブラウザのタブを閉じるまでの間だけ有効なsessionStorageのフラグで制御する(サーバー側は10分の時間窓のみを保証し、実際に1回だけ見せる制御はクライアント側の責務、というT10での判断を実装した)
- テスト(settings-withdraw.test.tsx、tabs.test.tsx)は、パスワード入力・送信でsignOut→トップページへの遷移、パスワード未入力では送信されないこと、justCanceledWithdrawalがtrueのときだけトーストが表示されることを確認した

### T12

- Workerのモジュール形式(export default { fetch, scheduled })で、`scheduled`ハンドラを追加した(src/worker/index.ts)。既存のHonoアプリ(app.fetch)はそのまま`fetch`に渡し、`scheduled`は新設の`src/worker/scheduled/purge.ts`の`runScheduledPurge`を呼ぶだけにした
- wrangler.jsonに`triggers.crons: ["0 18 * * *"]`(UTC 18:00 = 日本時間3:00)を追加した。開発用(トップレベル)・本番(env.production)の両方に設定した(本番だけ設定すると、pnpm devでの動作確認ができないため)
- D1が外部キーのON DELETE CASCADEを実際に有効にしているかどうかは、ドキュメントを読むだけでなく実際にテストで確認する必要があると判断し、test/worker/scheduled-purge.test.tsで退会済みユーザーのuser行を削除した後にsession・habit・calorie_log・account_deletionの行がすべて消えていることを確認した。結果、D1は既定でPRAGMA foreign_keys相当が有効になっており、明示的な削除コードは不要だった
- テストで`worker.scheduled(controller, env, ctx)`を直接呼び出す(`createScheduledController()`・`createExecutionContext()`は`@cloudflare/vitest-plugin`が提供する)ため、`src/worker/index.ts`のexportを`ExportedHandler<Env>`型の変数として明示的に型付けした(オブジェクトリテラルのまま`export default`すると、実装した関数の引数の数(2つ)がexportの型として推論され、3引数で呼ぶテストが型エラーになったため)
- 1回の定期処理で削除する件数に上限(100件)を設け、削除件数のみをログに出す(メールアドレス等は出さない)
