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
