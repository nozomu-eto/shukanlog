import { applyD1Migrations, env } from "cloudflare:test";

// テスト実行前にD1へマイグレーションを適用する(既知の落とし穴6への対策)
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
