# ステップ2 進捗管理

## T0: 作業前の準備

- [x] git status確認(未コミットの変更なし。stash不要)
- [x] git fetch origin → main が origin/feat/foundation の内容を含むことを確認(diffなし)
- [x] feat/data-api ブランチを作成(origin/main から)
- [x] docs/progress/step2.md を作成

## タスク一覧

- [x] T1: 本番のメール送信先の制限を外す
- [x] T2: 静的ファイルのヘッダを_headersで付ける
- [x] T3: CSPのスタイルの方針を決める
- [x] T4: 使わないコードだけのログインの入口を閉じる
- [x] T5: react-routerに一本化する
- [x] T6: 共通の定数と型
- [x] T7: 日本時間の日付の関数
- [x] T8: 週・月の期間の計算
- [x] T9: テーブル定義とマイグレーション
- [x] T10: 認証が必要なAPIの共通の仕組み
- [x] T11: 自分の情報と同意のAPI
- [x] T12: 日ごとの記録を取得するAPI
- [x] T13: 習慣の記録API
- [x] T14: カロリー記録のAPI
- [x] T15: プロフィールのAPI
- [x] T16: 週・月の集計API
- [x] T17: 他人のデータに触れないことの横断テスト
- [ ] T18: ドキュメント
- [ ] T19: PRの作成

## 判断ログ

### T0

- git remote(origin)は設定済みで、origin/main は d4ade05(ステップ1のマージ済み内容)を指している。origin/feat/foundation(37b50c9)は main を1つ余分にマージしたコミットが乗っているだけでツリーの差分は無いことを`git diff d4ade05 37b50c9 --stat`で確認した(main が feat/foundation の内容を含むことの確認)
- 未コミットの変更は無かったため stash は行っていない
- 作業ディレクトリは git worktree であり、リポジトリ本体側で `main` ブランチがロックされていたため、`main` をこのworktreeでチェックアウトすることはできなかった。そのため `git checkout -b feat/data-api origin/main` で、ブランチ名 `main` を経由せず直接 origin/main の内容から feat/data-api を作成した(結果は指示にある「main をチェックアウトしてから分岐する」場合と同じコミットになる)

### T1

- Cloudflare公式ドキュメント(node_modules/wrangler/config-schema.json)で`send_email`バインディングのプロパティを確認した。`destination_address`は「1つの検証済みアドレスに制限する」ためのものであり、指定するとそのアドレスにしか送れなくなる。指示通り削除し、`allowed_sender_addresses: ["noreply@shukanlog.com"]`で送信元だけを限定する設定に変更した

### T2

- ヘッダーの値を`src/shared/security-headers.ts`に一元化し、`src/worker/middleware/security-headers.ts`(/api/*向け)と`public/_headers`(静的ファイル向け)の両方から使う形にした。`public/_headers`はビルド成果物ではなく手書きのファイルのため、値が食い違わないことを`test/frontend/security-headers-file.test.ts`でファイル内容と`buildCspReportOnlyHeaderValue()`等の戻り値を突き合わせて確認する方式にした
- 不要になった`src/worker/routes/assets.ts`と`ASSETSバインディング`(wrangler.jsonの`assets.binding`)を削除した。`assets.run_worker_first`を`["/api/*"]`に戻したことで、静的ファイルはWorkerを経由せずCloudflareのアセット配信が直接返すようになったため
- 既存のセキュリティヘッダテスト(test/worker/security-headers.test.ts)は、静的ファイル向けのパス(`/`、`/no-such-page`、`/assets/*`)がもはやWorkerを通らなくなったため、`/api/health`のみを確認する内容に書き換えた
- `wrangler dev`(ポート18787)を起動し、curlで以下を確認した(すべて意図通り)
  - `GET /`: 200、HSTS・X-Content-Type-Options・Referrer-Policy・X-Frame-Options・CSP Report-Onlyが付与される(Cache-Controlは`public, max-age=0, must-revalidate`でmax-age=31536000ではない。index.htmlは`/assets/*`に該当しないため意図通り)
  - `GET /assets/<ビルド後のファイル名>`: 200、上記セキュリティヘッダに加え`Cache-Control: public, max-age=31536000, immutable`が付与される
  - `GET /no-such-page`(存在しないパス): 200でindex.htmlが返り(SPAのフォールバック)、セキュリティヘッダが付与される
  - `GET /api/health`: 200のJSON、`hono/secure-headers`によるセキュリティヘッダ(HSTS・CSP Report-Only・Referrer-Policy・X-Content-Type-Options・X-Frame-Optionsなど)が付与される

### T3

- Honoの`secureHeaders`の型定義(node_modules/hono/dist/types/middleware/secure-headers/secure-headers.d.ts)で`styleSrcElem`・`styleSrcAttr`ディレクティブが指定できることを確認した。`style-src-elem 'self'`(style要素・外部CSSは自分自身のみ)、`style-src-attr 'unsafe-inline'`(style属性は許可。計算で決まる値のみに使う運用ルールで補う)を、Hono側(src/worker/middleware/security-headers.ts)とpublic/_headersの両方に反映した(値はsrc/shared/security-headers.tsに一元化済み)
- AGENTS.mdに「style属性は計算で決まる値だけに使う」ルールを追記した

### T4

- インストール済みのbetter-authのソース(node_modules/better-auth/dist/plugins/email-otp/routes.mjs、index.mjs)を確認し、emailOTPプラグインが登録するエンドポイント一覧(いずれも/api/auth配下)を洗い出した
  - `POST /sign-in/email-otp`: メールアドレスとコードだけでログインできる(パスワード不要)。shukanlogでは使わないため**閉じた**
  - `POST /email-otp/send-verification-otp`・`/email-otp/verify-email`・`/email-otp/check-verification-otp`: メールアドレス確認用のコード送信・検証(T7で使用中)。閉じていない
  - `POST /email-otp/request-password-reset`・`/email-otp/reset-password`・`/forget-password/email-otp`: パスワード再設定用(T7で使用中)。閉じていない
  - `POST /email-otp/request-email-change`・`/email-otp/change-email`: メールアドレス変更用。ステップ4で使う予定のためエンドポイント自体は閉じていないが、`changeEmail.enabled`オプションを有効化していないため、呼び出すとBetter Auth自身が400(`Change email with OTP is disabled`)を返す実装になっていることをソースで確認した(ログインできる系ではないため、指示の対象外と判断)
  - `createVerificationOTP`・`getVerificationOTP`エンドポイントはOTP値の作成・参照のみでセッションを発行しない(ログイン機能ではない)ため閉じる対象外と判断した
- 上記より、閉じる対象は`/api/auth/sign-in/email-otp`の1つのみと判断し、`src/worker/middleware/disabled-auth-endpoints.ts`でBetter Authに処理を渡す前に404(`{ error: { code: "NOT_FOUND", message: "Not Found" } }`)を返すようにした

### T5

- `pnpm remove react-router-dom` → `pnpm add react-router@7` で入れ替え、importを`react-router-dom`から`react-router`に書き換えた対象は`main.tsx`・`router.tsx`・`routes/not-found.tsx`・`routes/app/require-auth.tsx`の4ファイル。React Router v7の公式ドキュメントで、ライブラリモードでは`react-router`への一本化が推奨されていることを確認した(APIはreact-router-domと同じで、importの向き先のみ変わる)

### T6

- `src/shared/limits.ts`・`types.ts`・`policy.ts`・`initial-habits.ts`の4ファイルに分けて定義した(1ファイルに詰め込まず、種類ごとに分けた方が今後の見通しがよいと判断)
- 記録の結果の型(`HabitLogResult`)には「未記録」を表す値を含めず、指示通り「未記録は記録そのものが無い状態」で表す方針にした。APIのレスポンスでは`result | null`のように`null`で未記録を表す

### T7

- 「今日」の判定・日付文字列⇔Dateの変換は、実行環境(machineやWorkers)のローカルタイムゾーンに一切依存させないため、`Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" })`でタイムスタンプ→日本時間の日付文字列を得て、日付同士の前後移動(shiftDays・shiftMonthsClamped)はUTC基準の`Date.UTC`で計算する方式にした(暦日としての計算にローカルタイムゾーンを混入させないため)
- `en-CA`ロケールの`Intl.DateTimeFormat`はYYYY-MM-DD形式で日付を返す仕様(MDN公式ドキュメントで確認)を利用し、タイムゾーン変換の実装を自前で書かずに済ませた
- テストは、UTCと日本時間で日付がずれる時刻(UTC 2026-09-24T15:30:00Zが日本時間で9月25日になるケースと、まだ同じ日のケース)、うるう年の2/29の有効判定、月末の丸め(平年・うるう年双方)、不正な日付(2026-02-30、2026-13-01)を含めた

### T8

- 月タブのカレンダーのマスは、前月・翌月の実際の日付は持たせず`null`(空欄)で表す設計にした(docs/week-month-tabs.md 3.2「前月・翌月の日付のマスは空欄」の記述に合わせた。前月・翌月の日付そのものを表示する仕様ではないため)。マスの総数は7の倍数になり、6行を超えないことをテスト(2026年2月、28日・1日が日曜)で確認した
- 「次へ」「今日に戻る」の可否は、どちらも「今日が表示中の期間に含まれるか」の否定で表せる(仕様上は別の見出しだが条件は同じ)ため、共通の`isTodayWithinPeriod`を経由する2つの関数として実装した
- 「前へ」ボタンには移動不可の条件が仕様に無いため、常に許可される関数として実装した(移動先の下限を設けていない)
- 週の期間表示の「今年以外」の判定は、表示中の週の開始年と、引数で渡した「今日」の年を比較する形にした(今日はサーバー側で日本時間の今日を渡す想定)
- テストは、年またぎの週(2026/12/28〜2027/1/3)、アカウント作成日が期間の途中にある場合の分母、今日が期間の途中にある場合の分母、今日を含む期間での次へ・今日に戻るの不可、2月のカレンダーのマス数を含めた

### T9

- 既存の`src/worker/db/schema/auth.ts`(Better Auth生成)の書式(sqliteTable、integer/text、index)に合わせて`records.ts`を追加した
- IDはcrypto.randomUUID()で発行する想定のtext主キー、日時はSQLite側の既定値(`unixepoch('subsecond') * 1000`のUNIXミリ秒)を使う点をauth.tsから踏襲した。日付(record_date)はYYYY-MM-DD文字列のtext列にした
- `profile`は1ユーザー1件のため、独立したid列を持たせず`user_id`をそのまま主キーにした
- `habit`の`(user_id, kind)`一意制約は「初期データの二重作成防止」用。`habit_log`の`(habit_id, record_date)`一意制約は「同じ日・同じ習慣の記録は1件」を保証するためで、PUT /api/habit-logsの作成・更新の実装(T13)がこの制約に依存する
- すべてのuser_idはuser.idを参照し`onDelete: "cascade"`にした(D1はデフォルトで外部キー制約が有効であることを、実際にuserを削除して関連行が連動削除されることを確認するテストで検証した)
- `pnpm run db:generate`でmigrations/0002_short_rictor.sqlを生成した。テスト(test/worker/db-records.test.ts)で各テーブルへの書き込み・読み出し、一意制約(habit/habit_log/terms_agreement)、ユーザー削除時の連動削除を確認した
- D1の内容はテスト間で初期化されない(既存のテストが`crypto.randomUUID()`でメールアドレスを一意にしていたのと同じ理由)ため、テストごとに`crypto.randomUUID()`で一意なuserIdを使うようにした

### T10

- セッションの取得は、Better Authの型定義(node_modules/better-auth/dist/types/api.d.mts)で`auth.api.getSession({ headers })`が`{ session, user } | null`を返すサーバー用APIであることを確認して使った
- 書き込みのレート制限は、Workers Rate Limitingバインディング(`API_RATE_LIMITER`)をユーザーID(`c.get("userId")`)をキーとして使う形にした。既存のwrangler.jsonの設定(60秒に300回)はステップ1で「API全体への粗い制限」として用意されたのみでどこにも実装で使われておらず未使用だったため、今回T10で初めて配線した。書き込み(POST/PUT/PATCH/DELETE)専用の制限としては300回/60秒は大きすぎる(通常の利用でそこまで連続して書き込むことはない)と判断し、60秒に60回に変更した
- `/api/me`・`/api/consent`はrequireSessionは必須のままrequireConsentだけ除外する構成にした(同意の有無を確認・記録するエンドポイント自体が同意済みであることを要求すると自己矛盾するため)
- 未処理のエラーは`app.onError`で500(`INTERNAL_ERROR`)にし、`console.error(err)`でログにはスタックトレースを出すが、レスポンスには含めないようにした
- ルーティングとミドルウェアの検証は、本番の`apiRouter`(まだ具体的なエンドポイントを持たない)に直接テスト用のルートを足すとプロダクションのルーターを汚してしまうため、`requireSession`・`requireConsent`・`writeRateLimit`の3つのミドルウェア関数を直接importした最小限のHonoアプリをテストファイル内に作り、Honoの`app.request(input, init, env)`(公式ドキュメントに「testingに便利なメソッド」と明記)でcloudflare:testの`env`を渡して検証する方式にした
- 同一テストファイル内でBetter Authの新規登録(60秒に3回のcustomRule)に抵触しないよう、`signUpAndSignIn`の呼び出し回数を3回に抑える形にテストを構成した(test/worker/support/auth.tsに、サインアップ→メール確認→ログインをまとめて行うヘルパーを追加した。以降のタスクのテストからも再利用する)

### T11

- zod・@hono/zod-validatorをこのタスクで新規に導入した(package.jsonに未記載だったため)。入力の検証エラーはすべて`src/worker/lib/validation.ts`の共通関数`validate()`経由で400(`VALIDATION_ERROR`)にする方針にした
- 初期データの作成(プロフィール1件・習慣2件)と同意の記録は、`db.batch()`で1つのD1バッチとしてまとめ、それぞれ`onConflictDoNothing()`を付けて実行するようにした。一意制約(T9)により、既にある行は無視され、欠けている行だけが作られるため、「同意を何度呼んでも重複しない」「初期データの一部が欠けていても補完される」の両方を1つの実装で満たせる
- `policyVersion`が現在の`POLICY_VERSION`と一致しない場合のエラーコードは、指示に明記が無かったため、入力値の不正として扱い他の検証エラーと同じ`VALIDATION_ERROR`にした
- GET /api/me・POST /api/consentの両方とも、`requireConsent`の対象外(apiRouterの`PATHS_WITHOUT_CONSENT_CHECK`)としつつ`requireSession`は必須のままにした(T10で設計した通り)

### T12

- 習慣とその日の記録は、habitテーブルとhabit_logテーブルを`leftJoin`で結合する1クエリで取得し、日ごとに個別のクエリを発行しない実装にした(未記録の習慣はresultがnullのまま返る)
- カロリー記録の無効判定は、profile行が無い(まだ同意していない、通常はrequireConsentで弾かれるため実運用では起きないが)場合のフォールバックとして既定値trueを使うようにした
- このファイルでもBetter Authの新規登録レート制限に抵触しないよう、signUpAndSignInの呼び出しを2回に抑え、1人の利用者で複数の日付・観点(記録あり/なし/未来/不正な日付)をまとめて確認する構成にした

### T13

- 作成・更新は`onConflictDoUpdate({ target: [habitLog.habitId, habitLog.recordDate], set: {...} })`で1つのINSERT文にまとめた(T9の一意制約`habit_log_habit_record_date_unique`をconflict targetとして使う)
- 「他人の習慣・存在しない習慣を区別させない」という指示に沿って、habitの取得条件に`userId`を含め(`and(eq(habit.id, habitId), eq(habit.userId, userId))`)、見つからない場合は理由を区別せず同じ404にした
- 日付の未来チェックはT12と同様にルーター側(index.ts)で行い、habitの所有者チェックやpartialの妥当性チェックはハンドラの実装(habit-logs.ts)側で行う分担にした
- このファイルでの新規登録は3回(自分の習慣の作成・更新・取り消し・partialの400・未来日の400を1人でまとめて確認、他人の習慣への404を確認する2人目、というテスト構成)で、Better Authのレート制限の上限(60秒に3回)ちょうどに収めた

### T14

- 「カロリー記録を無効にしている利用者の書き込みは403」のチェックは、他人の記録かどうか(404)より先に行う実装にした。他人の記録の判定は常にuserId込みで検索するため、チェックの順序を変えても他人の記録の有無が漏れることはない
- PATCHはcalories・noteのどちらも省略可能にし、省略した項目は既存の値のまま(`input.calories ?? existing.calories`)にした。noteを空文字列で更新することはでき(nullishでないため`??`では上書きされる)、実質的なメモの削除にも使える
- カロリー記録が無効な利用者向けの判定(`isCalorieTrackingEnabled`)は、profile行が無い場合は既定でtrueとして扱う(T12の日次記録取得と同じ方針)
- このファイルでの新規登録も3回に抑え、1人目で入力上限の境界値(10000/10001、500/501文字)と未来日の400、作成・更新・削除の一連の流れをまとめて確認し、2人目・3人目で他人の記録への404とカロリー記録無効時の403を確認する構成にした

### T16

- 習慣・習慣の記録・カロリー記録をそれぞれ1クエリで取得し(合計3クエリ、カロリー記録が無効な場合は2クエリ)、日付ごとの集計はメモリ上のMapで行う実装にした(日ごとにクエリを発行しない)
- 期間内の日ごとの`calories`は、カロリー記録が有効な場合は「その日の記録の合計(記録が無ければ0)」、無効な場合は常にnullにした(T12の`/api/days`の考え方(total 0 vs null)を踏襲した)
- カロリーの平均(`totals.calories.average`)は「記録がある日(calorie_logが1件以上ある日)」の日次合計だけで算出し、記録が0日ならnullにした
- テストでeligibleDaysの期待値をハードコードすると実行日(テストを実行する実際の日付)に依存して壊れるため、テストコード側でも`countEligibleDays`を直接呼んで期待値を独立に計算し、実装の結果と突き合わせる方式にした(日付をまたいでテストが実行されても壊れないようにするため)

### T17

- APIの実際の形を確認したところ、他人のデータに「ID指定で触れられる」経路はPUT /api/habit-logs(habitId)とPATCH/DELETE /api/calorie-logs/:idの2つだけだった(GET /api/days・GET /api/summary・PATCH /api/profileはいずれもセッションのuserId起点でしか自分のデータを参照せず、他人のIDを指定する余地がない)。そのため、横断テストはこの2つのエンドポイントに対する利用者Bからの操作(更新・取り消し・更新・削除)が404になること、操作後も利用者Aのデータが変更されていないこと、そして利用者Bが自分のGET /api/daysを取得しても利用者Aの記録が一切現れないことを1つのテストにまとめた

### T15

- PATCH /api/profileはprofile行の更新のみ行い、カロリー記録(calorie_log)そのものには一切触れない実装にした。無効化してもT12の`/api/days`がcaloriesをnullで返すことで見えなくなるだけで、データ自体は残ることをテストで確認した(再度有効化すると同じ記録が見える)
