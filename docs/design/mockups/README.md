# デザインのモックアップ(参照専用)

claude.ai の Design キャンバス「shukanlog デザイン」の各画面を書き出したもの。**アプリのビルドには含めない参照用のファイル**で、このままブラウザで開いても表示されない(キャンバス専用の `support.js` が必要なため)。

実装時は、ここにある HTML の構造・余白・文字サイズ・色・文言を見て、`docs/design.md` の規則に沿って React のコンポーネントとして作り直す。規則とモックアップが食い違う場合は `docs/design.md` を優先する。

- 元のキャンバス(人が確認する用): https://claude.ai/artifact/PKhrofv56c7iCKkW6tcKeA
- `*PC.dc.html` が PC 版(幅1280px)、それ以外がスマホ版(幅390px)
- 画面内のデータ(記録・カロリー・日付)はサンプル
- フォントは Google Fonts から読み込んでいるが、これはモックアップだけの都合。アプリは Fontsource で自前配信する

| ファイル | 画面 |
|---|---|
| Main | デザインの基本(色・記号・文字・アイコン) |
| Top / TopPC | トップページ |
| Login / LoginPC、LoggedOut | ログイン、ログアウト後 |
| Signup / SignupPC | 新規登録 |
| Verify / VerifyPC | 確認コードの入力 |
| ResetRequest / ResetRequestPC、ResetNew / ResetNewPC | パスワードの再設定(2画面) |
| Consent / ConsentPC | 利用規約への同意 |
| Day / DayPC | 日タブ |
| DayEmpty、DayLoading、DayError | 日タブ(初回・読み込み中・エラー) |
| Week / WeekPC | 週タブ |
| Month / MonthPC、MonthCalorieOff | 月タブ、カロリー記録オフ |
| CalorieForm / CalorieFormPC | カロリーの記録・編集 |
| Settings / SettingsPC | 設定 |
| EmailChange / EmailChangePC | メールアドレスの変更 |
| PasswordChange / PasswordChangePC | パスワードの変更 |
| Withdraw / WithdrawPC | 退会 |
| NotFound / NotFoundPC | 404 |
