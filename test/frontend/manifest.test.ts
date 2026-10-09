import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// public/manifest.webmanifest が正しいJSONで、指定したアイコンのファイルが
// public/ に実在することを確認する(ホーム画面への追加が壊れていないかの確認)
const manifestPath = path.join(process.cwd(), "public/manifest.webmanifest");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

describe("public/manifest.webmanifest", () => {
	it("name・short_name・lang・start_url・scope・displayが仕様通りである", () => {
		expect(manifest.name).toBe("shukanlog");
		expect(manifest.short_name).toBe("shukanlog");
		expect(manifest.lang).toBe("ja");
		expect(manifest.start_url).toBe("/app");
		expect(manifest.scope).toBe("/");
		expect(manifest.display).toBe("standalone");
	});

	it("背景色・テーマ色がデザインの背景色(#F5F5F3)である", () => {
		expect(manifest.background_color).toBe("#F5F5F3");
		expect(manifest.theme_color).toBe("#F5F5F3");
	});

	it("icons に指定した192・512・maskable-512のファイルがpublic/に実在する", () => {
		expect(Array.isArray(manifest.icons)).toBe(true);
		expect(manifest.icons).toHaveLength(3);
		for (const icon of manifest.icons) {
			const iconPath = path.join(process.cwd(), "public", icon.src);
			expect(existsSync(iconPath)).toBe(true);
		}
		const maskableIcon = manifest.icons.find((icon: { src: string }) => icon.src === "/icon-maskable-512.png");
		expect(maskableIcon.purpose).toBe("maskable");
	});
});
