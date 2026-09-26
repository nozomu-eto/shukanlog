# ステップ3 進捗管理

## T0: 作業前の準備

- [x] git status確認(未コミットの変更なし。stash不要)
- [x] git fetch origin → origin/main が ステップ2の内容(docs/progress/step2.md、docs/api.md)を含むことを確認
- [x] feat/ui-day ブランチを作成(origin/main から。worktree で `main` ブランチ自体をチェックアウトできなかったため、ステップ2と同様に `git checkout -b feat/ui-day origin/main` で直接作成した)
- [x] docs/progress/step3.md を作成

## タスク一覧

- [x] T1: 集計APIで「記録なし」と「0kcal」を区別する
- [x] T2: テストの新規登録の回数制限を外す
- [x] T3: 画面の土台(データ取得・認証クライアント・API クライアント)
- [x] T4: 共通の部品
- [x] T5: トップページ(/)
- [x] T6: ログイン(/login)
- [x] T7: 新規登録(/signup)と Turnstile
- [x] T8: 確認コードの入力(/verify)
- [x] T9: パスワードの再設定(/reset、/reset/new)
- [x] T10: 画面の振り分け
- [ ] T11: 利用規約への同意(/consent)
- [x] T12: アプリの枠(ヘッダー・日週月の切り替え)
- [x] T13: 日タブ(記録の表示と保存)
- [x] T14: カロリーの記録・編集
- [ ] T15: 画面の動作確認
- [ ] T16: ドキュメント
- [ ] T17: 持ち越し事項の整理
- [ ] T18: PRの作成

## 判断ログ

### T0

- git status確認: 未コミットの変更なし。stash不要
- `git fetch origin` 後、origin/main(2f8adf5)に docs/progress/step2.md・docs/api.md が含まれることを確認した(ステップ2の内容を含む)
- worktree のため `main` ブランチ自体をチェックアウトできなかった(他のworktreeでロック中)。ステップ2と同じ対応方針で `git checkout -b feat/ui-day origin/main` を実行した

### T1

- GET /api/summary の `days[].calories` は、`caloriesByDate`(Map)に日付ごとの合計を積む際、その日にカロリー記録が1件でもあれば(合計が0でも)キーが作られる性質を利用し、`caloriesByDate.has(date)` で「記録が1件以上ある日」かどうかを判定するように変更した。記録が無い日は `null`、0kcalを含む記録がある日はその合計(0を含む)を返す
- 平均の計算(`totals.calories.average`)はもともと「記録がある日(calorie_logが1件以上ある日)」だけで算出する実装のままで変更不要だった。0kcalの日もこの「記録がある日」に含まれるため、平均計算に反映されることをテストで確認した
- GET /api/days/:date の `calories`(`{ total, items }` 形式)は、items が空配列かどうかで「記録なし」を判別できる別の形なので、このタスクの対象外(T1の指示にある「現在は0を返している」という問題はsummaryのみに存在していたため)と判断した

### T2

- test/worker/support/auth.ts の signUpAndSignIn に、呼び出しごとに10.x.x.xの範囲でランダムな一意のIPアドレスを発行する randomTestIp() を追加し、新規登録・メール確認・ログインのすべてのリクエストに cf-connecting-ip ヘッダーとして付けるようにした。レート制限のカウンタ自体はIPアドレスごとに分かれる実装(T8で確認済み)のため、利用者ごとに別IPにすることでカウンタが共有されなくなる
- auth-rate-limit.test.ts は指示通り変更していない(同じIP・固定値のままレート制限に達すること・別IPは影響を受けないことを確認し続ける)
- 各テストファイルに残っていた「新規登録レート制限に抵触しないよう呼び出し回数を抑える」旨のコメントを、実態に合わせて整理した(テストの内容・呼び出し回数自体は変更していない)

### T3

- @tanstack/react-query を導入し、src/react-app/lib/query-client.ts に1つのQueryClientを用意した。既定でrefetchOnWindowFocus: true(画面に戻った時に最新の記録を見せるため)、retry: false(失敗はエラー表示・再読み込みボタンで伝える方針のため)にした
- Better Authのクライアントは better-auth/react の createAuthClient と better-auth/client/plugins の emailOTPClient を使い、src/react-app/lib/auth-client.ts に用意した。node_modules内の実装(client/proxy.mjs)を確認し、authClient.emailOtp.sendVerificationOtp/verifyEmail/requestPasswordReset/resetPasswordのようなメソッド名(パスをキャメルケース化したもの)でサーバーのemail-otpエンドポイントを呼び出せることを確認した
- 新規登録のみ必要なTurnstileトークンは、authClientの各メソッドの第2引数(fetchOptions)にheadersとして渡せることをclient/proxy.mjsのコードで確認した(withTurnstileToken()ヘルパーを用意)
- src/react-app/api/client.ts に共通のfetch処理(credentials: include、JSONの組み立て・解析、エラーレスポンスをApiErrorに変換)をまとめ、src/react-app/api/errors.ts にエラーコード→日本語文言の変換(toDisplayMessage)を用意した。VALIDATION_ERROR等のサーバー側messageは既にAPI側で日本語の文になっているため、基本はそのまま使い、message が無い場合だけコードごとの既定文言にfallbackする方針にした
- docs/api.md の各APIに対応する関数・型を src/react-app/api/me.ts・days.ts・habit-logs.ts・calorie-logs.ts・profile.ts・summary.ts に用意した
- Turnstileのサイトキーは .env.example に VITE_TURNSTILE_SITE_KEY として用意し、値はCloudflare公式のテスト用サイトキー(常に成功する 1x00000000000000000000AA)にした。実際にVITE_TURNSTILE_SITE_KEYを読んで使う実装(Turnstileウィジェット部品)はT7で行う
- eslint-plugin-jsx-a11y を導入し、eslint.config.js に jsxA11y.flatConfigs.recommended を追加した
- main.tsx にQueryClientProviderを追加した。トースト表示の仕組み(ToastProvider)はT4で作るため、main.tsxへの組み込みはT4のコミットで行う

### T4

- ボタン(Button.tsx)は、a要素として使う場合(to=アプリ内遷移、href=外部リンク・mailto)とbutton要素の両方を1つのコンポーネントで扱えるようにし、見た目(primary/secondary/danger/inline)はCSSクラスで共通化した。jsx-a11yのanchor-has-contentがrest展開のchildrenを静的解析できず誤検知したため、コメント付きで無効化した
- 入力欄はTextField、パスワード欄は表示/隠すの切り替え(aria-pressed)を持つPasswordFieldとして分けた。どちらもuseIdでid/aria-describedby/aria-invalidを自動で組み立てる
- トースト(Toast.tsx)はReact Contextで実装し、ToastProviderをmain.tsxでアプリ全体に1つだけ配置、useToast()でどこからでも呼び出せるようにした。2秒(TOAST_DURATION_MS)で自動的に消える
- スケルトン(Skeleton.tsx)は幅・高さが呼び出し側ごとに異なる(グラフの棒と同様、あらかじめCSSクラスを用意しきれない値)ため、AGENTS.mdの例外(実行時にしか決まらない値)に該当すると判断し、style属性で幅・高さだけを指定する設計にした
- ダイアログ(Dialog.tsx)はネイティブのdialog要素+showModal()を使い、openプロパティがfalseの間はdialog自体をDOMに置かない設計にした。フォーカスの復帰は、ブラウザ標準の挙動に加えて、開く前にフォーカスされていた要素を明示的に記録して閉じたときに自分でfocus()する実装にした(jsdomがshowModal()のフォーカス復帰を実装していないため、テストのためにも自前で保証する必要があった)
- jsdomが`<dialog>`のshowModal()/close()、Escキーでのcancelイベントを実装していないため、test/frontend/setup.tsに最小限のポリフィルを追加した(実ブラウザの完全な再現ではなく、テストに必要な範囲のみ)
- test.globalsを有効にしていないため、@testing-library/reactの自動cleanup(afterEachでのunmount)が効かないことに気づき、test/frontend/setup.tsに明示的なafterEach(cleanup)を追加した(1ファイル内で複数のitが同じ部品を描画するテストが増えるこのステップ以降で必要になるため)
- 未ログイン向けの画面の枠(UnauthHeader.tsx)は、サービス名のみ・戻る矢印付き・「ログイン」リンク付きの組み合わせをprops(backTo, showLogin)で切り替えられるようにした

### T5

- authClient.useSession()でログイン状態を判定し、isPendingの間は何も表示せず(画面のちらつき防止)、セッションがあれば/appへNavigateする実装にした
- 週のふりかえりの例(今週のふりかえりカード)は、docs/design/mockups/Top.dc.htmlのサンプルデータ(服薬◯◯×◯◯、運動△◯×△◯)をそのままStatusIconで再現した
- フッターの利用規約・プライバシーポリシーへのリンクは、アプリ内遷移のためreact-routerのLinkにした(モックアップは#terms等のプレースホルダーだが、実際のルート/terms・/privacyへのリンクにする判断をした)。お問い合わせはモックアップ通りmailto:のaタグのままにした

### T6

- authClient.signIn.email()の戻り値({data,error})でエラー判定する方式にした。better-fetchの型定義(node_modules内)を確認し、errorオブジェクトには`code`(BASE_ERROR_CODES、例: EMAIL_NOT_VERIFIED・INVALID_EMAIL_OR_PASSWORD)と`status`が含まれることを確認した
- メール未確認でのログイン試行時、better-auth側の実装(sign-in.mjs)でsendVerificationEmailオプションを設定していない場合は403 EMAIL_NOT_VERIFIEDを返すことをソースで確認した。この場合はauthClient.emailOtp.sendVerificationOtp()で確認コードを再送し、メールアドレスをreact-routerのstate + sessionStorage(pending-email.ts、以降のT7〜T9でも共通利用)で受け渡して/verifyへ移動する実装にした
- レート制限(429)は better-auth のレスポンスに`code`が無く`{message}`のみなことをソース(rate-limiter/index.mjs)で確認したため、`error.status === 429`で判定する実装にした
- 認証系フォーム共通のレイアウト(auth-form.module.css)を用意した。.stack(縦並び+gap)を<form>要素にも外側の.card(PCのみ視覚的な箱になる)にも使うことで、スマホでは1つのフラットな縦並びに、PCでは中央寄せのカードになるようにした
- 入力チェックの共通関数(validateEmail・validatePasswordRequired・validateNewPassword・validateOtp)をsrc/react-app/lib/validators.tsにまとめ、T7以降の新規登録・パスワード再設定でも再利用する

### T7

- Cloudflare公式ドキュメント(WebFetchで取得)でexplicit renderingの方法を確認した。スクリプトは`?render=explicit`付きで1回だけ読み込み(モジュールスコープのPromiseで多重読み込みを防止)、`turnstile.render(container, { sitekey, callback, "error-callback", "expired-callback" })`でウィジェットを描画し、アンマウント時に`turnstile.remove(widgetId)`する実装にした。期限切れ(expired-callback)ではトークンをクリアしたうえで`turnstile.reset(widgetId)`を呼び、再チャレンジさせるようにした
- サーバー側のturnstileMiddleware(src/worker/middleware/turnstile.ts)は、アプリの他のAPIと同じ`{ error: { code, message } }`の形でエラーを返すが、better-fetchはレスポンスのJSON本文をそのままerrorオブジェクトへspreadする実装(node_modules内のソースで確認)のため、Better Auth自身のエラー(フラットな`{code, message}`)とはerrorオブジェクトの形が異なってしまう(前者は`error.error.code`、後者は`error.code`)。ワーカー側は変更せず、フロントエンド側でどちらの形でも読み取れる`getAuthErrorCode()`ヘルパー(auth-client.ts)を用意して吸収した
- 新規登録のsignUp.email()にはnameが必須(better-authの既定スキーマ)だが、モックアップ・仕様に氏名の入力欄が無いため、name には email の値をそのまま渡すことにした(利用者に別途名前を入力させない判断)
- Turnstileのサイトキーは`import.meta.env.VITE_TURNSTILE_SITE_KEY`から読み、未設定時はCloudflare公式のテスト用サイトキーにfallbackする(T3で用意した.env.exampleの値と同じ)
- 登録に成功したら、メールアドレスをsessionStorage(pending-email.ts)とreact-routerのstateの両方で/verifyへ渡す

### T8

- **確認後に自動でログインする方式にした**。better-authのソース(email-otp/routes.mjsのverifyEmailOTP、api/routes/email-verification.mjs)を確認し、`ctx.context.options.emailVerification?.autoSignInAfterVerification`がtrueの場合、確認コード検証の成功時にそのまま`internalAdapter.createSession()`→`setSessionCookie()`が呼ばれてログイン済みになる実装であることを確認した。src/worker/auth/options.tsに`emailVerification: { autoSignInAfterVerification: true }`を追加した(T3のコミット時点では保留にしていたオプション追加をこのT8でコミットする)
- 上記により、/verifyで確認コードの検証に成功したら、そのまま/consentへ移動する実装にした(ログイン画面を経由しない)
- 受け渡されたメールアドレスが無い場合(react-routerのstateにもsessionStorageにも無い)は/signupへ移動する
- 「確認コードを再送する」は、押した瞬間に60秒のカウントダウンを開始し、0になるまでボタンをdisabledにする実装にした
- emailOTPプラグインのエラーコード(EMAIL_OTP_ERROR_CODES)を確認し、INVALID_OTP(コードが正しくない)・OTP_EXPIRED(期限切れ)の2つだけが定義されていることを確認して、それぞれ個別の文言を出し分けるようにした

### T9

- requestPasswordResetEmailOTPの実装(routes.mjs)を確認し、登録されていないメールアドレスでも常に`{success:true}`を返す(内部でuserが見つからなければ検証用の行を消して早期returnするだけで、エラーにはしない)ことを確認した。そのためフロントエンド側は結果を分岐せず、常に/reset/newへ進める実装にした
- /reset/newで成功したら、react-routerのstateで「パスワードを変更しました」を渡して/loginへ移動する。ログイン画面(T6で実装済み)は既にstate.messageを見出しの上に表示する仕組みを持っているため、そのまま再利用できた

### T10

- /app配下はRequireAuth(既存のGET /api/auth/get-session直接fetch方式から、authClient.useSession() + react-queryのGET /api/me取得に置き換えた)、/consentはConsentGuard、/login・/signup・/verify・/reset・/reset/newはRedirectIfAuthenticatedの3つのガードコンポーネントに分けた
- RedirectIfAuthenticatedはパスを持たない「レイアウトルート」(react-routerの公式パターン)にし、子ルートのpathは先頭のスラッシュを付けない相対パス("login"等)にした。先頭に"/"を付けた絶対パスを子ルートに書くと、react-routerの解決規則上ネストの意図が伝わらない・警告が出る可能性があるため、公式ドキュメントのレイアウトルートの書き方に合わせた
- 判定中(セッション確認・GET /api/me取得)は画面のちらつきを避けるため何も表示しない(null)。GET /api/meの取得に失敗した場合は、振り分けをブロックせずそのまま子ルートを表示し、エラー表示は各画面自身のデータ取得に委ねる設計にした
- テストはauthClient・api/meモジュールをvi.mockでモックし、未ログイン・未同意・同意済みの3パターンをMemoryRouter上で確認した(test/frontend/routes/require-auth.test.tsx、consent-guard.test.tsx、redirect-if-authenticated.test.tsx)

### T11

- 利用規約・プライバシーポリシーのリンクは、モックアップでは`target="_blank"`のaタグ(別タブ)だったが、react-routerのLinkでも`target="_blank"`を指定でき別タブで開けるため、アプリ内ルート(/terms・/privacy)へのLinkにした
- 同意後は`postConsent(POLICY_VERSION)`を呼び、react-queryの`["me"]`キャッシュを`invalidateQueries`で更新してから/appへ移動する(次にRequireAuthが評価するときに最新のconsent.agreed=trueを見られるようにするため)
- 「同意せずにログアウトする」は確認なしで`authClient.signOut()`を呼び、「ログアウトしました」をstateで渡して/loginへ移動する

### T12

- ヘッダーは1つのCSS Gridコンテナ(app-shell.module.css の .header)にし、grid-template-areasをスマホ(サービス名+設定アイコンの行、その下に日週月の行)とPC(サービス名・切り替え・設定を1行に横並び)で切り替える実装にした。DOMの親子関係を変えずに配置だけをブレークポイントで変えられるため、React側の条件分岐を増やさずに済んだ
- 設定へのリンクは1つ(アイコン+「設定」の文字)にし、文字部分はスマホ幅では`display:none`、PC(1024px以上)で表示する実装にした(アイコンのみのスマホ表示、アイコン+文字のPC表示を1つの要素で両立させるため)
- 日・週・月の切り替えはLinkの`to`をhrefFor(tab)で組み立て、現在の`date`クエリパラメータがあればそのまま引き継ぐ。選択中のタブに`aria-current="page"`を付けている
- tabが週・月の場合と/app/settingsは、指示通りステップ4まで見出しだけの仮ページのままにした。/app/settingsにはログアウトボタンを仮に置き、ログアウト後は「ログアウトしました」をstateで渡して/loginへ移動する動作を確認できるようにした
- router.tsxで、RequireAuthの子にAppShell(パスを持たないレイアウトルート)を挟み、その子として日週月タブ・設定系のルートを並べる3階層構成にした

### T13

- 表示する日付は、URLのdateクエリパラメータをsrc/shared/domain/dateのisValidDateString・isFutureで検証し、無い・不正・未来ならtodayInTokyo()の今日にフォールバックする実装にした(前へ・次へ・今日に戻るのリンクは、この解決後の日付を基準に組み立てる)
- 記録の保存はreact-queryの`queryClient.setQueryData(["day", date], ...)`で楽観的更新し、`putHabitLog`が失敗したら保存前のデータ(`getQueryData`で退避しておいたもの)に戻す実装にした。useMutationは使わず、素朴なasync関数+try/catchにした(テストのしやすさと処理の見通しを優先した判断)
- 「今日の記録をはじめましょう」のバナーは、GET /api/me(react-queryの`["me"]`キャッシュ、T10のガードと共有)のaccountCreatedDateが今日、かつその日の全習慣のresultがnullの場合に、通常の習慣カードに加えて表示する(モックアップDayEmpty.dc.htmlの通り、カード自体は隠さない)
- 読み込み中はスケルトン(aria-hidden、読み上げ用に別途role="status"のテキストのみの要素)、取得失敗時は`role="alert"`のエラーカード+「再読み込み」ボタン(dayQuery.refetch())を表示する
- 「次の日」は今日を表示中はリンクではなくaria-disabled="true"のspanにして、クリックしても遷移できないようにした(テストでtagNameがA(アンカー)でないことを確認)
- テストはgetDay・putHabitLog・getMeをvi.mockし、保存→取り消し、保存失敗時の巻き戻し、今日は次の日へ進めないことを確認した(test/frontend/routes/day-tab.test.tsx)

### T14

- カロリーのカードは、GET /api/days/:dateのcaloriesがnull(カロリー記録を無効にしている利用者)の場合はカード自体を表示しない実装にした(T13のday-tab.tsxに追記する形にした)
- CalorieForm(T4のDialogを使う)は、editingプロパティがnullなら新規作成(POST /api/calorie-logs)、値があれば編集(PATCH /api/calorie-logs/:id)にした。日ごとの記録のDayCalorieItem型(id・calories・noteのみ)をそのまま渡せるよう、CalorieLogResponse型ではなく最小限の独自の型を編集対象のpropsにした
- 保存・削除に成功したら、呼び出し元(day-tab.tsx)のonSavedコールバックでダイアログを閉じ、`queryClient.invalidateQueries({queryKey: ["day", date]})`で日ごとの記録を再取得し、トーストを出す
- 削除は「この記録を削除する」→確認文言+「やめる」「削除する」の2段階の確認にした(状態はCalorieForm内のconfirmingDeleteで管理)
- 入力の検証(validateCalorieAmount・validateCalorieNote)はsrc/react-app/lib/validators.tsに追加し、src/shared/limits.tsのCALORIE_MIN・CALORIE_MAX・CALORIE_NOTE_MAX_LENGTHをサーバーと同じ値として使う
- テストは、10001・小数の入力エラー、新規作成、編集、削除の2段階確認をCalorieFormコンポーネント単体で確認した(test/frontend/routes/calorie-form.test.tsx。api/calorie-logsをvi.mock)
