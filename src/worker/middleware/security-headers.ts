import { secureHeaders } from "hono/secure-headers";

// 全レスポンスに付与するセキュリティヘッダ。
// CSPはまだReport-Onlyで導入し、違反を確認してから本適用に切り替える方針
export const securityHeadersMiddleware = secureHeaders({
	strictTransportSecurity: "max-age=31536000; includeSubDomains",
	xContentTypeOptions: "nosniff",
	referrerPolicy: "strict-origin-when-cross-origin",
	xFrameOptions: "DENY",
	contentSecurityPolicyReportOnly: {
		defaultSrc: ["'self'"],
		// Google Fontsなど外部フォントは使わない
		fontSrc: ["'self'"],
		// Turnstileのウィジェットを読み込めるようにする
		scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
		frameSrc: ["https://challenges.cloudflare.com"],
	},
});
