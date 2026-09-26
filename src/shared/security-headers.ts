// 全レスポンスに付与するセキュリティヘッダの値を1か所にまとめたもの。
// API(src/worker/middleware/security-headers.ts)と静的ファイル(public/_headers)の
// 両方がこの定義を参照する(またはテストでこの定義と一致することを確認する)ことで、
// 2箇所の設定値がずれないようにする。

// 単純な文字列で表せるヘッダー(HSTS・nosniff・Referrer-Policy・クリックジャッキング対策)
export const SECURITY_HEADER_VALUES = {
	strictTransportSecurity: "max-age=31536000; includeSubDomains",
	xContentTypeOptions: "nosniff",
	referrerPolicy: "strict-origin-when-cross-origin",
	xFrameOptions: "DENY",
} as const;

// CSP(Report-Only)の各ディレクティブの許可元
export const CSP_DIRECTIVES = {
	defaultSrc: ["'self'"],
	// Google Fontsなど外部フォントは使わずFontsourceで自前配信するため'self'のみ
	fontSrc: ["'self'"],
	// Turnstileのウィジェットを読み込めるようにする
	scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
	frameSrc: ["https://challenges.cloudflare.com"],
} as const;

// CSPディレクティブ名(Honoのプロパティ名)から、ヘッダー値で使うkebab-caseの名前への対応表
const CSP_DIRECTIVE_NAMES: Record<keyof typeof CSP_DIRECTIVES, string> = {
	defaultSrc: "default-src",
	fontSrc: "font-src",
	scriptSrc: "script-src",
	frameSrc: "frame-src",
};

// Content-Security-Policy-Report-Only ヘッダーの値(1行の文字列)を組み立てる。
// public/_headers に書く値も、この関数の戻り値と一致させる(テストで確認する)
export function buildCspReportOnlyHeaderValue(): string {
	return (Object.keys(CSP_DIRECTIVES) as (keyof typeof CSP_DIRECTIVES)[])
		.map((key) => `${CSP_DIRECTIVE_NAMES[key]} ${CSP_DIRECTIVES[key].join(" ")}`)
		.join("; ");
}

// ビルドで出力されるハッシュ付きファイル(/assets/*)に付ける長期キャッシュの値
export const ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";
