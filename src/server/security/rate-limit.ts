import { SERVER_LIMITS } from "../config/limits";
import { HttpError } from "../http";

type UsageAction = "case" | "vote" | "report";

const HOURLY_LIMITS: Record<UsageAction, number> = {
  case: SERVER_LIMITS.casesPerHour,
  vote: SERVER_LIMITS.votesPerHour,
  report: SERVER_LIMITS.reportsPerHour,
};

const DAILY_LIMITS: Record<UsageAction, number> = {
  case: SERVER_LIMITS.casesPerDay,
  vote: SERVER_LIMITS.votesPerDay,
  report: SERVER_LIMITS.reportsPerDay,
};

const DAILY_COLUMNS: Record<UsageAction, "cases_created" | "votes_cast" | "reports_created"> = {
  case: "cases_created",
  vote: "votes_cast",
  report: "reports_created",
};

export async function consumeUsage(db: D1Database, action: UsageAction, actorHash: string, now: number): Promise<void> {
  const windowStart = Math.floor(now / 3600) * 3600;
  const rateKey = `${action}:${windowStart}:${actorHash}`;
  const day = new Date(now * 1000).toISOString().slice(0, 10);
  const dailyColumn = DAILY_COLUMNS[action];

  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO rate_limits (rate_key, action, count, window_start, expires_at)
         VALUES (?, ?, 1, ?, ?)
         ON CONFLICT(rate_key) DO UPDATE SET count = count + 1`,
      )
      .bind(rateKey, action, windowStart, windowStart + 7200),
    db.prepare("SELECT count FROM rate_limits WHERE rate_key = ? LIMIT 1").bind(rateKey),
    db
      .prepare(
        `INSERT INTO daily_usage (usage_day, ${dailyColumn}) VALUES (?, 1)
         ON CONFLICT(usage_day) DO UPDATE SET ${dailyColumn} = ${dailyColumn} + 1`,
      )
      .bind(day),
    db.prepare(`SELECT ${dailyColumn} AS count FROM daily_usage WHERE usage_day = ? LIMIT 1`).bind(day),
  ]);

  const hourlyCount = Number((results[1].results[0] as { count?: number } | undefined)?.count ?? 0);
  const dailyCount = Number((results[3].results[0] as { count?: number } | undefined)?.count ?? 0);
  if (hourlyCount > HOURLY_LIMITS[action]) throw new HttpError(429, "rate_limited", "잠시 후 다시 시도해 주세요.");
  if (dailyCount > DAILY_LIMITS[action]) throw new HttpError(503, "daily_limit_reached", "오늘의 무료 공개 한도에 도달했습니다. 로컬 판결은 계속 사용할 수 있습니다.");
}
