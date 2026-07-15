import { cleanupExpired } from "./cleanup";
import type { Env } from "./env";
import { handleError, json, notFound, problem } from "./http";
import { deleteCase, hideCase } from "./routes/admin";
import { createCase, readCase } from "./routes/cases";
import { reportCase } from "./routes/reports";
import { voteOnCase } from "./routes/votes";

const SLUG_PATTERN = /^[a-z0-9_-]{10,32}$/;

function decodePathSegment(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function matchCasePath(pathname: string, suffix = ""): string | null {
  const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = pathname.match(new RegExp(`^/api/cases/([^/]+)${escapedSuffix}$`));
  const slug = decodePathSegment(match?.[1]);
  return slug && SLUG_PATTERN.test(slug) ? slug : null;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  if (url.pathname === "/api/health" && method === "GET") {
    await env.DB.prepare("SELECT 1 AS healthy").first<{ healthy: number }>();
    return json({ ok: true, service: "shagal-court", time: new Date().toISOString() });
  }
  if (url.pathname === "/api/cases" && method === "POST") return createCase(request, env);

  const plainSlug = matchCasePath(url.pathname);
  if (plainSlug && method === "GET") return readCase(plainSlug, env);
  const voteSlug = matchCasePath(url.pathname, "/vote");
  if (voteSlug && method === "PUT") return voteOnCase(request, voteSlug, env);
  const reportSlug = matchCasePath(url.pathname, "/report");
  if (reportSlug && method === "POST") return reportCase(request, reportSlug, env);

  const adminMatch = url.pathname.match(/^\/api\/admin\/cases\/([^/]+)(\/hide)?$/);
  const adminSlug = decodePathSegment(adminMatch?.[1]);
  if (adminSlug && SLUG_PATTERN.test(adminSlug)) {
    if (method === "POST" && adminMatch?.[2] === "/hide") return hideCase(request, adminSlug, env);
    if (method === "DELETE" && !adminMatch?.[2]) return deleteCase(request, adminSlug, env);
  }
  if (url.pathname.startsWith("/api/")) return notFound();
  return problem(405, "method_not_allowed", "허용되지 않은 요청입니다.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleApi(request, env);
    } catch (error) {
      return handleError(error);
    }
  },
  async scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext): Promise<void> {
    context.waitUntil(cleanupExpired(env).then((result) => console.log("cleanup", result)));
  },
} satisfies ExportedHandler<Env>;
