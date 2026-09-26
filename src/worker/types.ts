// Honoのコンテキストに載せる共有の変数(Variables)の型。
// requireSessionミドルウェアが設定し、以降のミドルウェア・ハンドラで参照する
export type AppVariables = {
	// ログイン中の利用者のID(user.id)
	userId: string;
	// ログイン中の利用者のメールアドレス
	userEmail: string;
	// 利用者のアカウント作成日(日本時間のYYYY-MM-DD)。集計の分母の計算に使う
	accountCreatedDate: string;
};

export type AppEnv = {
	Bindings: Env;
	Variables: AppVariables;
};
