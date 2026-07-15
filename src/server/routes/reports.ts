import type { ReportReason } from "../../shared/contracts";
import { getActiveCaseBySlug } from "../db/cases";
import type { Env } from "../env";
import { requireSecret } from "../env";
import { HttpError, json, notFound, parseJson } from "../http";
import { SERVER_LIMITS } from "../config/limits";
import { hmacHash, validateDeviceId } from "../security/identity";
import { consumeUsage } from "../security/rate-limit";

const REPORT_REASONS = ["personal-info", "threat", "hate", "spam", "other"] as const;

function validateReason(value: unknown): ReportReason {
  if (typeof value !== "string" || !REPORT_REASONS.includes(value as ReportReason)) throw new HttpError(400, "invalid_report", "신고 사유가 올바르지 않습니다.");
  return value as ReportReason;
}

export async function reportCase(request: Request, slug: string, env: Env): Promise<Response> {
  const body = (await parseJson(request, SERVER_LIMITS.requestBytes)) as Record<string, unknown>;
  const reason = validateReason(body.reason);
  const deviceId = validateDeviceId(body.deviceId);
  const now = Math.floor(Date.now() / 1000);
  const item = await getActiveCaseBySlug(env.DB, slug, now);
  if (!item) return notFound();

  const reporterHash = await hmacHash(requireSecret(env.HMAC_SECRET, "HMAC_SECRET"), "reporter", deviceId);
  const existing = await env.DB.prepare("SELECT reason FROM reports WHERE case_id = ? AND reporter_hash = ? LIMIT 1").bind(item.id, reporterHash).first<{ reason: string }>();
  if (existing) return json({ accepted: true, duplicate: true }, { status: 200 });

  await consumeUsage(env.DB, "report", reporterHash, now);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO reports (case_id, reporter_hash, reason, created_at) VALUES (?, ?, ?, ?)").bind(item.id, reporterHash, reason, now),
    env.DB
      .prepare("UPDATE cases SET report_count = report_count + 1, status = CASE WHEN report_count + 1 >= ? THEN 'hidden' ELSE status END WHERE id = ?")
      .bind(SERVER_LIMITS.reportHideThreshold, item.id),
  ]);
  return json({ accepted: true, duplicate: false }, { status: 201 });
}
