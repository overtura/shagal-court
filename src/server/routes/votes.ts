import type { VoteChoice } from "../../shared/contracts";
import { getActiveCaseBySlug } from "../db/cases";
import type { Env } from "../env";
import { requireSecret } from "../env";
import { HttpError, json, notFound, parseJson } from "../http";
import { SERVER_LIMITS } from "../config/limits";
import { hmacHash, validateDeviceId } from "../security/identity";
import { consumeUsage } from "../security/rate-limit";

interface VoteRow {
  choice: VoteChoice;
}

function validateChoice(value: unknown): VoteChoice {
  if (value !== "guilty" && value !== "not-guilty") throw new HttpError(400, "invalid_vote", "투표 선택이 올바르지 않습니다.");
  return value;
}

export async function voteOnCase(request: Request, slug: string, env: Env): Promise<Response> {
  const body = (await parseJson(request, SERVER_LIMITS.requestBytes)) as Record<string, unknown>;
  const choice = validateChoice(body.choice);
  const deviceId = validateDeviceId(body.deviceId);
  const now = Math.floor(Date.now() / 1000);
  const item = await getActiveCaseBySlug(env.DB, slug, now);
  if (!item) return notFound();

  const voterHash = await hmacHash(requireSecret(env.HMAC_SECRET, "HMAC_SECRET"), "voter", deviceId);
  const existing = await env.DB.prepare("SELECT choice FROM votes WHERE case_id = ? AND voter_hash = ? LIMIT 1").bind(item.id, voterHash).first<VoteRow>();
  if (existing?.choice === choice) {
    return json({ choice, votes: { guilty: item.guilty_votes, notGuilty: item.not_guilty_votes }, changed: false });
  }

  await consumeUsage(env.DB, "vote", voterHash, now);
  if (!existing) {
    const counterSql = choice === "guilty"
      ? "UPDATE cases SET guilty_votes = guilty_votes + 1 WHERE id = ? AND status = 'active'"
      : "UPDATE cases SET not_guilty_votes = not_guilty_votes + 1 WHERE id = ? AND status = 'active'";
    await env.DB.batch([
      env.DB.prepare("INSERT INTO votes (case_id, voter_hash, choice, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(item.id, voterHash, choice, now, now),
      env.DB.prepare(counterSql).bind(item.id),
    ]);
  } else {
    const counterSql = choice === "guilty"
      ? "UPDATE cases SET not_guilty_votes = MAX(not_guilty_votes - 1, 0), guilty_votes = guilty_votes + 1 WHERE id = ? AND status = 'active'"
      : "UPDATE cases SET guilty_votes = MAX(guilty_votes - 1, 0), not_guilty_votes = not_guilty_votes + 1 WHERE id = ? AND status = 'active'";
    await env.DB.batch([
      env.DB.prepare("UPDATE votes SET choice = ?, updated_at = ? WHERE case_id = ? AND voter_hash = ?").bind(choice, now, item.id, voterHash),
      env.DB.prepare(counterSql).bind(item.id),
    ]);
  }

  const updated = await getActiveCaseBySlug(env.DB, slug, now);
  if (!updated) return notFound();
  return json({ choice, votes: { guilty: updated.guilty_votes, notGuilty: updated.not_guilty_votes }, changed: true });
}
