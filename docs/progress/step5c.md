# ステップ5c 進捗管理(Workers Buildsの初回ビルド失敗の修正)

## タスク一覧

- [x] T1: pnpm-workspace.yaml に packages と onlyBuiltDependencies を追加
- [x] T2: env.production に name: shukanlog を追加
- [x] T3: ドキュメントのWorker名と2章の書き直し
- [x] T4: test / typecheck / lint / build の確認、PR作成(マイグレーションなし)

## 判断ログ

### T0

- PR #9・#10 は main にマージ済み。`git fetch` 後、origin/main から fix/workers-builds を作成した

### T1

- 先頭に `packages: ["."]` と、pnpm 10 用の `onlyBuiltDependencies`(esbuild・workerd)を追加した。既存の allowBuilds・minimumReleaseAgeExclude は残した
- ビルド環境の再現: git worktree(/private/tmp 配下)で、変更後のファイルを使い確認した
  - `npx pnpm@10.11.1 install --frozen-lockfile` が成功(「Ignored build scripts: @prisma/client, better-sqlite3」は、allowBuilds で false にしているものと同じで問題なし)
  - `npx pnpm@10.11.1 run build:production` が成功
  - pnpm-lock.yaml に差分は出なかった
- 確認後に worktree は削除した。作業中の node_modules には触れていない

### T2

- env.production に `"name": "shukanlog"` を追加した(Workers BuildsはダッシュボードのWorkerとwranglerのWorker名が違うとビルドが失敗するため)
- `build:production` 後の dist/shukanlog/wrangler.json を実際に確認した: name=`shukanlog`、targetEnvironment=production、D1=`shukanlog-production`(00ba9cfc-…)、ratelimits=2001・2002、BETTER_AUTH_URL=https://shukanlog.com
- `npx wrangler deploy --dry-run` も、DB shukanlog-production、レート制限2つ、本番のvars・MAILER で正しかった

### T3

- production-verification.md の2章を、Workers Builds(mainへのマージで自動実行、ビルドコマンド `pnpm run build:production`、デプロイコマンド `npx wrangler deploy`、本番以外のブランチは無効)前提に書き直し、マイグレーションは手元から `--env production` で実行する運用を書いた
- step5b.md の Worker 名の意味の `shukanlog-production` は、当時の生成名である旨を添えた(履歴として残すため書き換えはしていない)。D1データベース名は変更していない
- スキーマ変更のPRでは、マージ前にマイグレーションを適用する旨を追記した(自動デプロイが先に走るため。依頼にはない補足)

### T4

- pnpm test(51ファイル・175件)/ typecheck / lint(エラー0・警告1。StatusIcon.tsx の既存の警告)/ build がすべて通った。マイグレーションの追加なし
- vitest が「Tests closed successfully but something prevents the main process from exiting」と表示する場合があるが、テストはすべて成功している(今回の変更とは無関係)
- PR: https://github.com/nozomu-eto/shukanlog/pull/11
