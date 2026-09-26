import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	ASSET_CACHE_CONTROL,
	buildCspReportOnlyHeaderValue,
	SECURITY_HEADER_VALUES,
} from "../../src/shared/security-headers";

// public/_headers に書いたヘッダーの値が、src/shared/security-headers.ts で定義した値と
// 一致していることを確認する(Workerの/api/*向けの値と、静的ファイル向けの値がずれるのを防ぐため)。
// vitestはリポジトリルートで実行される前提で process.cwd() から辿る
const headersFilePath = path.join(process.cwd(), "public/_headers");
const headersFileContent = readFileSync(headersFilePath, "utf-8");

describe("public/_headers", () => {
	it("すべてのパス(/*)にセキュリティヘッダが定義されている", () => {
		expect(headersFileContent).toContain(
			`Strict-Transport-Security: ${SECURITY_HEADER_VALUES.strictTransportSecurity}`,
		);
		expect(headersFileContent).toContain(
			`X-Content-Type-Options: ${SECURITY_HEADER_VALUES.xContentTypeOptions}`,
		);
		expect(headersFileContent).toContain(`Referrer-Policy: ${SECURITY_HEADER_VALUES.referrerPolicy}`);
		expect(headersFileContent).toContain(`X-Frame-Options: ${SECURITY_HEADER_VALUES.xFrameOptions}`);
		expect(headersFileContent).toContain(
			`Content-Security-Policy-Report-Only: ${buildCspReportOnlyHeaderValue()}`,
		);
	});

	it("/assets/* に長期キャッシュのCache-Controlが定義されている", () => {
		expect(headersFileContent).toContain("/assets/*");
		expect(headersFileContent).toContain(`Cache-Control: ${ASSET_CACHE_CONTROL}`);
	});
});
