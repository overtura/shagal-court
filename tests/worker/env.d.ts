import type { D1Migration } from "@cloudflare/vitest-pool-workers";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    APP_ENV: string;
    CASE_TTL_DAYS: string;
    HMAC_SECRET: string;
    ADMIN_TOKEN: string;
    TEST_MIGRATIONS: D1Migration[];
  }
}
