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
- [ ] T5: トップページ(/)
- [ ] T6: ログイン(/login)
- [ ] T7: 新規登録(/signup)と Turnstile
- [ ] T8: 確認コードの入力(/verify)
- [ ] T9: パスワードの再設定(/reset、/reset/new)
- [ ] T10: 画面の振り分け
- [ ] T11: 利用規約への同意(/consent)
- [ ] T12: アプリの枠(ヘッダー・日週月の切り替え)
- [ ] T13: 日タブ(記録の表示と保存)
- [ ] T14: カロリーの記録・編集
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
