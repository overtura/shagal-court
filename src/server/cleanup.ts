import { SERVER_LIMITS } from "./config/limits";
import type { Env } from "./env";

export async function cleanupExpired(env: Env, now = Math.floor(Date.now() / 1000)): Promise<{ cases: number; rateLimits: number }> {
  const [cases, rateLimits] = await env.DB.batch([
    env.DB
      .prepare("DELETE FROM cases WHERE id IN (SELECT id FROM cases WHERE expires_at <= ? ORDER BY expires_at ASC LIMIT ?)")
      .bind(now, SERVER_LIMITS.cleanupBatchSize),
    env.DB.prepare("DELETE FROM rate_limits WHERE expires_at <= ?").bind(now),
  ]);
  return { cases: cases.meta.changes, rateLimits: rateLimits.meta.changes };
}
