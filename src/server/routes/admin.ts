import type { Env } from "../env";
import { requireSecret } from "../env";
import { HttpError, json } from "../http";
import { timingSafeEqual } from "../security/identity";

function authorize(request: Request, env: Env): void {
  const expected = requireSecret(env.ADMIN_TOKEN, "ADMIN_TOKEN");
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!timingSafeEqual(supplied, expected)) throw new HttpError(401, "unauthorized", "관리자 인증에 실패했습니다.");
}

export async function hideCase(request: Request, slug: string, env: Env): Promise<Response> {
  authorize(request, env);
  const result = await env.DB.prepare("UPDATE cases SET status = 'hidden' WHERE slug = ?").bind(slug).run();
  return json({ hidden: result.meta.changes > 0 });
}

export async function deleteCase(request: Request, slug: string, env: Env): Promise<Response> {
  authorize(request, env);
  const result = await env.DB.prepare("DELETE FROM cases WHERE slug = ?").bind(slug).run();
  return json({ deleted: result.meta.changes > 0 });
}
