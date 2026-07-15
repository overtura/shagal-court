import type { CreateCaseRequest } from "../../shared/contracts";
import { calculateVerdict, isVerdictAnalysis } from "../../shared/verdict-engine";
import { getActiveCaseBySlug, getCaseByIdempotencyHash, insertCase, toPublicCase } from "../db/cases";
import type { Env } from "../env";
import { requireSecret } from "../env";
import { HttpError, json, notFound, parseJson } from "../http";
import { SERVER_LIMITS } from "../config/limits";
import { validatePublicStatement } from "../security/content";
import { hmacHash, randomToken, validateDeviceId, validateIdempotencyKey } from "../security/identity";
import { consumeUsage } from "../security/rate-limit";
import { verifyTurnstile } from "../security/turnstile";

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "invalid_body", "요청 본문이 올바르지 않습니다.");
  return value as Record<string, unknown>;
}

function caseTtlSeconds(env: Env): number {
  const requestedDays = Number.parseInt(env.CASE_TTL_DAYS, 10);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), SERVER_LIMITS.maximumCaseTtlDays) : SERVER_LIMITS.maximumCaseTtlDays;
  return days * 24 * 60 * 60;
}

export async function createCase(request: Request, env: Env): Promise<Response> {
  const body = asObject(await parseJson(request, SERVER_LIMITS.requestBytes));
  const publicStatement = validatePublicStatement(body.publicStatement);
  const deviceId = validateDeviceId(body.deviceId);
  const idempotencyKey = validateIdempotencyKey(body.idempotencyKey);
  if (body.consent !== true) throw new HttpError(400, "consent_required", "공개와 90일 보관에 동의해야 합니다.");
  if (!isVerdictAnalysis(body.analysis)) throw new HttpError(400, "invalid_analysis", "분석값이 올바르지 않습니다.");
  await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET, env.TURNSTILE_HOSTNAME);

  const secret = requireSecret(env.HMAC_SECRET, "HMAC_SECRET");
  const creatorHash = await hmacHash(secret, "creator", deviceId);
  const idempotencyHash = await hmacHash(secret, "case-idempotency", `${deviceId}:${idempotencyKey}`);
  const now = Math.floor(Date.now() / 1000);
  const existing = await getCaseByIdempotencyHash(env.DB, idempotencyHash);
  if (existing) {
    if (existing.status !== "active" || existing.expires_at <= now) return notFound();
    return json({ case: toPublicCase(existing), url: `/case/${existing.slug}`, reused: true });
  }

  await consumeUsage(env.DB, "case", creatorHash, now);
  const verdict = calculateVerdict(body.analysis);
  const record = {
    id: randomToken(18),
    slug: randomToken(9).toLowerCase(),
    publicStatement,
    analysis: body.analysis,
    verdict,
    creatorHash,
    idempotencyHash,
    createdAt: now,
    expiresAt: now + caseTtlSeconds(env),
  } satisfies Parameters<typeof insertCase>[1];

  try {
    await insertCase(env.DB, record);
  } catch (error) {
    const raced = await getCaseByIdempotencyHash(env.DB, idempotencyHash);
    if (raced) {
      if (raced.status !== "active" || raced.expires_at <= now) return notFound();
      return json({ case: toPublicCase(raced), url: `/case/${raced.slug}`, reused: true });
    }
    throw error;
  }

  return json({ case: toPublicCase({
    id: record.id,
    slug: record.slug,
    public_statement: record.publicStatement,
    category: record.analysis.category,
    analysis_json: JSON.stringify(record.analysis),
    verdict_code: record.verdict.code,
    verdict_score: record.verdict.score,
    verdict_json: JSON.stringify(record.verdict),
    engine_version: record.verdict.engineVersion,
    status: "active",
    guilty_votes: 0,
    not_guilty_votes: 0,
    report_count: 0,
    created_at: record.createdAt,
    expires_at: record.expiresAt,
  }), url: `/case/${record.slug}`, reused: false }, { status: 201 });
}

export async function readCase(slug: string, env: Env): Promise<Response> {
  const item = await getActiveCaseBySlug(env.DB, slug, Math.floor(Date.now() / 1000));
  return item ? json({ case: toPublicCase(item) }) : notFound();
}

export function parseCreateCaseBody(value: unknown): CreateCaseRequest {
  return value as CreateCaseRequest;
}
