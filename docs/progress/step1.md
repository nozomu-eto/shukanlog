# ステップ1 進捗管理

## T0: 作業前の準備

- [x] git status確認(未コミットの変更なし。stash不要)
- [x] docs/design.md、docs/week-month-tabs.md、docs/design/mockups/、docs/legacy/ の存在確認
- [x] feat/foundation ブランチを作成
- [x] docs/progress/step1.md を作成

## タスク一覧

- [x] T1: 雛形を整える
- [ ] T2: テストとlintの準備
- [ ] T3: wranglerの設定と本番環境の分離
- [ ] T4: D1とdrizzle
- [ ] T5: メール送信
- [ ] T6: Better Authの基本設定
- [ ] T7: 確認コード(6桁)による確認・パスワード再設定
- [ ] T8: 認証のレート制限
- [ ] T9: 新規登録のbot対策(Turnstile)
- [ ] T10: セキュリティヘッダとキャッシュ
- [ ] T11: デザインの基礎(色・文字)
- [ ] T12: アイコンとStatusIcon
- [ ] T13: 画面の骨組み(ルーティング)
- [ ] T14: ドキュメント
- [ ] T15: PRの作成

## 判断ログ

### T0(記録の訂正)

- 以前のコミットで作成された本ファイルに、このリポジトリ以外のリポジトリ(../mokuhyo-planner、../kyurl-link)を参照した記述が誤って含まれていた。指示の最重要ルール「このリポジトリ以外のリポジトリは参照しない」に反するため、該当の記述を削除し、タスク一覧・T0のログを指示内容に合わせて書き直した。

### T1

- tsconfig のテスト用設定(tsconfig.test.json)は、T1時点では test/ 配下に実ファイルが存在せず、include が空だと tsc がエラーになるため、T2でテストファイルと同時に追加することにした。T1では既存のフロントエンド用(tsconfig.app.json)・Worker用(tsconfig.worker.json)の分割のみを維持する
- React Router は react-router-dom を採用した(SPA として使うための標準的な選択で、公式ドキュメント上もライブラリモードでの利用が案内されている)
- ルーティングの本実装(design.md 8章のURL一覧)はT13で行うため、T1では最小限のプレースホルダー("/" のみ)を用意した
- styles/tokens.css・styles/ui.css は空の器としてT1で作成し、内容はT11で定義する
