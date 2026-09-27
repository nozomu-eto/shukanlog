# 本番公開前の確認事項

本番環境(`--env production`)にデプロイする前に、手動で確認・実施する項目です。このステップ(ステップ1)では、本番環境へのデプロイ・wrangler secretの登録・本番D1の作成は行っていません。

## 1. プレースホルダーの置き換え

`wrangler.json`の`env.production`内にある、次の値を実際の値に置き換える。

- `d1_databases[].database_id`(`REPLACE_WITH_PRODUCTION_D1_DATABASE_ID`)
- `ratelimits[].namespace_id`(実際のnamespace_idを払い出して置き換える)

`send_email[].allowed_sender_addresses`は`noreply@shukanlog.com`に設定済み(destination_addressは指定していない。指定すると検証済みの1つの宛先にしか送れなくなり、利用者への送信ができなくなるため)。

## 2. 本番D1データベースの作成

```bash
npx wrangler d1 create shukanlog-production
```

出力された`database_id`を`wrangler.json`の`env.production.d1_databases[0].database_id`に設定し、マイグレーションを適用する。

```bash
npx wrangler d1 migrations apply DB --remote --env production
```

## 3. シークレットの登録

`wrangler secret put <名前> --env production`で、少なくとも次を登録する。

- `BETTER_AUTH_SECRET`(`npx auth secret`または`openssl rand -base64 32`などで生成した、十分に長くランダムな値)
- `TURNSTILE_SECRET_KEY`(本番用のTurnstileシークレットキー。4を参照)

## 4. Turnstileの本番キー

Cloudflareダッシュボードで本番ドメイン用のTurnstileウィジェットを作成し、サイトキー(フロントエンドに埋め込む)とシークレットキー(`TURNSTILE_SECRET_KEY`として登録)を、テスト用キーから本番用キーに差し替える。

## 5. Email Sendingのドメイン登録と実機での送信確認

1. Cloudflareダッシュボードで送信元ドメイン(`shukanlog.com`)をEmail Sendingに登録し、検証を完了する
2. 検証していない任意の宛先に送るにはWorkers Paidプランが必要な点を確認する
3. 実際に新規登録・パスワード再設定を行い、確認コードのメールが実際の受信箱に届くことを確認する(件名・本文が文字化けしていないか、迷惑メール判定されていないかも確認する)

## 6. 課金通知の設定

Cloudflareダッシュボードの請求設定で、Workers・D1・Email Sendingなどの使用量アラート(課金通知)を設定し、想定外の利用があった場合に気付けるようにする。

## 7. リポジトリを公開する前のシークレットスキャン

リポジトリを公開する場合は、公開前に次を確認する。

- `.dev.vars`・`.wrangler/`などがコミットされていないこと(`.gitignore`で除外済みだが、`git log`上に過去のコミットとして残っていないかも確認する)
- コミット履歴全体に対してシークレットスキャンツール(例: `gitleaks`、GitHubのsecret scanning)を実行し、APIキーやシークレットが含まれていないことを確認する
- `.dev.vars.example`に実際のシークレットではなく、プレースホルダーまたは公式のテスト用キーのみが書かれていることを確認する

## 8. 利用規約・プライバシーポリシーの日付の更新

`/terms`・`/privacy`(`src/react-app/routes/terms.tsx`・`privacy.tsx`)の最終改定日と、`src/shared/policy.ts`の`POLICY_VERSION`は、ステップ4の実装時点の日付(2026年9月27日)になっている。公開日が変わる場合は、公開前に両方を実際の公開日に更新する(`POLICY_VERSION`を変更すると、既存の利用者は次回ログイン時に再同意(`/consent`)を求められる)。

## 9. Cron Trigger(退会の完全削除・メール未確認ユーザーの削除)の本番での確認

`wrangler.json`の`triggers.crons`(`env.production`にも設定済み)は、デプロイすると自動的に有効になる。

1. デプロイ後、Cloudflareダッシュボード(Workers & Pages → 対象のWorker → Triggers → Cron Triggers)で、設定した実行時刻(`0 18 * * *`、日本時間3:00)が登録されていることを確認する
2. ダッシュボードの「Trigger」ボタン、または`npx wrangler deployments`のログ・Observabilityで、初回の実行が成功していること(エラーが出ていないこと)を確認する
3. 本番D1に対して、実際に退会から30日を過ぎた利用者やメール未確認のまま30日を過ぎた利用者が(いる場合に)削除されることを、件数のログで確認する(個人情報はログに出さない設計のため、メールアドレス等では確認できない)

## 10. 退会・完全削除の流れの確認(本番相当の環境で一度は通す)

本番へのデプロイ前に、ステージング相当の環境またはローカルの`pnpm dev`で、以下の流れを一度は実際に確認する(docs/progress/step4-manual-check.md参照)。

1. 退会すると即座にログインできなくなり、30日間はデータが残ること
2. 30日以内に同じメールアドレス・パスワードでログインすると退会が取り消され、「退会を取り消しました」が1回だけ表示されること
3. Cron Triggerの実行(または`runScheduledPurge`相当の処理)で、30日を過ぎた退会の利用者のデータが完全に削除され、関連するテーブルの行も連動して削除されること

## 11. 公開の準備(ファビコン・OGP・検索エンジン)の確認

ステップ5aで追加したファビコン・Manifest・OGP・robots.txt・サイトマップ・noindexは、実際に本番URL(https://shukanlog.com)で表示・取得できることを本番公開後に確認する。

1. 各SNS(X、Facebook等)のカード表示確認ツールに`https://shukanlog.com/`を入力し、OGPの画像(og-image.png)・タイトル・説明が正しく表示されることを確認する
2. ホーム画面への追加を実機で確認する
   - iPhoneのSafari: 共有メニューから「ホーム画面に追加」し、アイコン(apple-touch-icon.png)とアプリ名(shukanlog)が正しく表示されることを確認する
   - AndroidのChrome: メニューから「ホーム画面に追加」(または自動表示されるインストールバナー)で、Manifestのアイコン(icon-192.png・icon-512.png・icon-maskable-512.png)とアプリ名が正しく表示されることを確認する
3. 検索エンジン(Google Search Console等)にサイトマップ(`https://shukanlog.com/sitemap.xml`)を登録する
4. `curl -I https://shukanlog.com/app`・`curl -I https://shukanlog.com/login`等で、ログイン後・認証まわりの画面に`X-Robots-Tag: noindex`ヘッダーが付いていることを確認する(公開ページ`/`・`/terms`等には付いていないことも合わせて確認する)
