import type { ApiProblem } from "../shared/contracts";

const SECURITY_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
} as const;

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), { ...init, headers: { ...SECURITY_HEADERS, ...init.headers } });
}

export function problem(status: number, code: string, message: string): Response {
  const body: ApiProblem = { error: { code, message } };
  return json(body, { status });
}

export function notFound(): Response {
  return problem(404, "not_found", "사건을 찾을 수 없습니다.");
}

export async function parseJson(request: Request, maximumBytes: number): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) throw new HttpError(415, "invalid_content_type", "JSON 요청만 허용됩니다.");
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maximumBytes) throw new HttpError(413, "request_too_large", "요청이 너무 큽니다.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maximumBytes) throw new HttpError(413, "request_too_large", "요청이 너무 큽니다.");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new HttpError(400, "invalid_json", "올바른 JSON이 아닙니다.");
  }
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof HttpError) return problem(error.status, error.code, error.message);
  console.error("Unhandled API error", error instanceof Error ? error.message : "unknown");
  return problem(500, "internal_error", "요청을 처리하지 못했습니다.");
}
