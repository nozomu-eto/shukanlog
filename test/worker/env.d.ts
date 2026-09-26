import type { D1Migration } from "cloudflare:test";

// テストの実行前にD1マイグレーションを流し込むために miniflare の bindings 経由で注入している値の型
declare global {
	namespace Cloudflare {
		interface Env {
			TEST_MIGRATIONS: D1Migration[];
		}
	}
}
