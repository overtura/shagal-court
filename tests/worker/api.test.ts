import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../../src/server/index";
import { cleanupExpired } from "../../src/server/cleanup";
import { verifyTurnstile } from "../../src/server/security/turnstile";
import type { Env } from "../../src/server/env";
import { calculateVerdict, createLocalVerdict } from "../../src/shared/verdict-engine";
import type { PublicCase, ReportReason, VoteChoice } from "../../src/shared/contracts";

const testEnv = env as unknown as Env;

function token(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function call(path: string, method = "GET", body?: unknown, headers?: HeadersInit): Promise<Response> {
  return worker.fetch(new Request(`https://court.test${path}`, {
    method,
    headers: body ? { "content-type": "application/json", ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  }), testEnv);
}

function createPayload(overrides: Record<string, unknown> = {}) {
  const { analysis } = createLocalVerdict("퇴근 직전에 상사가 오늘 안에 끝낼 일을 줬다.");
  return {
    publicStatement: "퇴근 직전에 상사가 오늘 안에 끝낼 일을 줬다.",
    analysis,
    deviceId: token("device"),
    idempotencyKey: token("publish"),
    consent: true,
    ...overrides,
  };
}

async function createPublicCase(overrides: Record<string, unknown> = {}): Promise<{ case: PublicCase; url: string }> {
  const response = await call("/api/cases", "POST", createPayload(overrides));
  expect(response.status).toBe(201);
  return response.json() as Promise<{ case: PublicCase; url: string }>;
}

describe("Worker and D1 API", () => {
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM reports"),
      env.DB.prepare("DELETE FROM votes"),
      env.DB.prepare("DELETE FROM cases"),
      env.DB.prepare("DELETE FROM rate_limits"),
      env.DB.prepare("DELETE FROM daily_usage"),
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers health checks from the Worker runtime", async () => {
    const response = await call("/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, service: "shagal-court" });
  });

  it("creates, reads, and idempotently reuses a server-recalculated case", async () => {
    const payload = createPayload();
    const expected = calculateVerdict(payload.analysis);
    const created = await call("/api/cases", "POST", payload);
    expect(created.status).toBe(201);
    const first = await created.json() as { case: PublicCase; url: string; reused: boolean };
    expect(first.case.verdict).toEqual(expected);
    expect(first.reused).toBe(false);

    const repeated = await call("/api/cases", "POST", payload);
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toMatchObject({ url: first.url, reused: true });

    const read = await call(first.url.replace("/case/", "/api/cases/"));
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ case: { slug: first.case.slug, publicStatement: payload.publicStatement } });
    const usage = await env.DB.prepare("SELECT SUM(count) AS total FROM rate_limits WHERE action = 'case'").first<{ total: number }>();
    expect(usage?.total).toBeGreaterThanOrEqual(1);
  });

  it("stores only HMAC identity hashes and no raw device or network identifiers", async () => {
    const deviceId = token("device");
    const created = await createPublicCase({ deviceId });
    const row = await env.DB.prepare("SELECT creator_hash FROM cases WHERE slug = ? LIMIT 1").bind(created.case.slug).first<{ creator_hash: string }>();
    expect(row?.creator_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row?.creator_hash).not.toContain(deviceId);
    const columns = await env.DB.prepare("PRAGMA table_info(cases)").all<{ name: string }>();
    expect(columns.results.map(({ name }) => name)).not.toEqual(expect.arrayContaining(["ip", "user_agent", "fingerprint", "original_statement"]));
  });

  it("rejects malformed analysis and personal information before storage", async () => {
    const badAnalysis = await call("/api/cases", "POST", createPayload({ analysis: { confidence: 5 } }));
    expect(badAnalysis.status).toBe(400);
    const personalInfo = await call("/api/cases", "POST", createPayload({ publicStatement: "연락처는 010-1234-5678이다." }));
    expect(personalInfo.status).toBe(422);
  });

  it("creates, no-ops, and moves a vote without corrupting counters", async () => {
    const created = await createPublicCase();
    const slug = created.case.slug;
    const deviceId = token("voter");
    const vote = (choice: VoteChoice) => call(`/api/cases/${slug}/vote`, "PUT", { choice, deviceId });

    expect(await (await vote("guilty")).json()).toMatchObject({ changed: true, votes: { guilty: 1, notGuilty: 0 } });
    expect(await (await vote("guilty")).json()).toMatchObject({ changed: false, votes: { guilty: 1, notGuilty: 0 } });
    expect(await (await vote("not-guilty")).json()).toMatchObject({ changed: true, votes: { guilty: 0, notGuilty: 1 } });
    const counters = await env.DB.prepare("SELECT guilty_votes, not_guilty_votes FROM cases WHERE slug = ? LIMIT 1").bind(slug).first<{ guilty_votes: number; not_guilty_votes: number }>();
    expect(counters).toEqual({ guilty_votes: 0, not_guilty_votes: 1 });
  });

  it("deduplicates reports and hides a case at the threshold", async () => {
    const payload = createPayload();
    const createdResponse = await call("/api/cases", "POST", payload);
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json() as { case: PublicCase; url: string };
    const slug = created.case.slug;
    const report = (deviceId: string, reason: ReportReason) => call(`/api/cases/${slug}/report`, "POST", { deviceId, reason });
    const firstReporter = token("reporter");
    expect((await report(firstReporter, "spam")).status).toBe(201);
    expect(await (await report(firstReporter, "spam")).json()).toMatchObject({ duplicate: true });
    expect((await report(token("reporter"), "personal-info")).status).toBe(201);
    expect((await report(token("reporter"), "threat")).status).toBe(201);
    expect((await call(`/api/cases/${slug}`)).status).toBe(404);
    expect((await call("/api/cases", "POST", payload)).status).toBe(404);
  });

  it("requires the admin token for hide and delete", async () => {
    const first = await createPublicCase();
    expect((await call(`/api/admin/cases/${first.case.slug}/hide`, "POST", undefined, { authorization: "Bearer wrong-token-that-is-long-enough" })).status).toBe(401);
    expect((await call(`/api/admin/cases/${first.case.slug}/hide`, "POST", undefined, { authorization: `Bearer ${env.ADMIN_TOKEN}` })).status).toBe(200);
    expect((await call(`/api/cases/${first.case.slug}`)).status).toBe(404);

    const second = await createPublicCase();
    const deleted = await call(`/api/admin/cases/${second.case.slug}`, "DELETE", undefined, { authorization: `Bearer ${env.ADMIN_TOKEN}` });
    expect(await deleted.json()).toEqual({ deleted: true });
  });

  it("enforces hourly and daily soft limits while leaving local use independent", async () => {
    const deviceId = token("limited-device");
    for (let index = 0; index < 5; index += 1) {
      const response = await call("/api/cases", "POST", createPayload({ deviceId, idempotencyKey: token(`publish${index}`) }));
      expect(response.status).toBe(201);
    }
    const limited = await call("/api/cases", "POST", createPayload({ deviceId, idempotencyKey: token("publish6") }));
    expect(limited.status).toBe(429);

    const day = new Date().toISOString().slice(0, 10);
    await env.DB.prepare("INSERT INTO daily_usage (usage_day, cases_created) VALUES (?, 500) ON CONFLICT(usage_day) DO UPDATE SET cases_created = 500").bind(day).run();
    const daily = await call("/api/cases", "POST", createPayload({ deviceId: token("daily-device") }));
    expect(daily.status).toBe(503);
    expect(await daily.json()).toMatchObject({ error: { code: "daily_limit_reached" } });
  });

  it("rejects failed Turnstile verification", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    await expect(verifyTurnstile("token-that-is-long-enough", "secret-that-is-long-enough", undefined)).rejects.toMatchObject({ code: "turnstile_failed" });
  });

  it("returns generalized 404 for SQL injection, expiration, and hidden records", async () => {
    expect((await call(`/api/cases/${encodeURIComponent("' OR 1=1 --")}`)).status).toBe(404);
    expect((await call("/api/cases/%E0%A4%A")).status).toBe(404);
    expect((await call("/api/admin/cases/%E0%A4%A", "DELETE", undefined, { authorization: `Bearer ${env.ADMIN_TOKEN}` })).status).toBe(404);
    const payload = createPayload();
    const createdResponse = await call("/api/cases", "POST", payload);
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json() as { case: PublicCase; url: string };
    await env.DB.prepare("UPDATE cases SET expires_at = ? WHERE slug = ?").bind(Math.floor(Date.now() / 1000) - 1, created.case.slug).run();
    expect((await call(`/api/cases/${created.case.slug}`)).status).toBe(404);
    expect((await call("/api/cases", "POST", payload)).status).toBe(404);
    const result = await cleanupExpired(testEnv);
    expect(result.cases).toBeGreaterThanOrEqual(1);
  });
});
