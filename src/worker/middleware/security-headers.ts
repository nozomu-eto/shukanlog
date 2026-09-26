import { secureHeaders } from "hono/secure-headers";
import { CSP_DIRECTIVES, SECURITY_HEADER_VALUES } from "../../shared/security-headers";

// 全レスポンス(/api/配下)に付与するセキュリティヘッダ。
// 静的ファイルは public/_headers で同じ値を付けており、値は src/shared/security-headers.ts に
// 一元化している(2箇所の値がずれないようにするため)。
// CSPはまだReport-Onlyで導入し、違反を確認してから本適用に切り替える方針
export const securityHeadersMiddleware = secureHeaders({
	strictTransportSecurity: SECURITY_HEADER_VALUES.strictTransportSecurity,
	xContentTypeOptions: SECURITY_HEADER_VALUES.xContentTypeOptions,
	referrerPolicy: SECURITY_HEADER_VALUES.referrerPolicy,
	xFrameOptions: SECURITY_HEADER_VALUES.xFrameOptions,
	contentSecurityPolicyReportOnly: {
		defaultSrc: [...CSP_DIRECTIVES.defaultSrc],
		fontSrc: [...CSP_DIRECTIVES.fontSrc],
		scriptSrc: [...CSP_DIRECTIVES.scriptSrc],
		frameSrc: [...CSP_DIRECTIVES.frameSrc],
		styleSrcElem: [...CSP_DIRECTIVES.styleSrcElem],
		styleSrcAttr: [...CSP_DIRECTIVES.styleSrcAttr],
	},
});
