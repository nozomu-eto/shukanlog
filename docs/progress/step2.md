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
- [ ] T9: テーブル定義とマイグレーション
- [ ] T10: 認証が必要なAPIの共通の仕組み
- [ ] T11: 自分の情報と同意のAPI
- [ ] T12: 日ごとの記録を取得するAPI
- [ ] T13: 習慣の記録API
- [ ] T14: カロリー記録のAPI
- [ ] T15: プロフィールのAPI
- [ ] T16: 週・月の集計API
- [ ] T17: 他人のデータに触れないことの横断テスト
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
