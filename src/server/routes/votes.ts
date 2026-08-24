import type { VoteChoice } from "../../shared/contracts";
import { getActiveCaseBySlug } from "../db/cases";
import type { Env } from "../env";
import { requireSecret } from "../env";
import { asJsonObject, HttpError, json, notFound, parseJson } from "../http";
import { SERVER_LIMITS } from "../config/limits";
import { hmacHash, validateDeviceId } from "../security/identity";
import { consumeUsage } from "../security/rate-limit";

interface VoteResultRow {
  choice: VoteChoice;
  guilty_votes: number;
  not_guilty_votes: number;
}

function validateChoice(value: unknown): VoteChoice {
  if (value !== "guilty" && value !== "not-guilty") throw new HttpError(400, "invalid_vote", "투표 선택이 올바르지 않습니다.");
  return value;
}

export async function voteOnCase(request: Request, slug: string, env: Env): Promise<Response> {
  const body = asJsonObject(await parseJson(request, SERVER_LIMITS.requestBytes), ["choice", "deviceId"]);
  const choice = validateChoice(body.choice);
  const deviceId = validateDeviceId(body.deviceId);
  const now = Math.floor(Date.now() / 1000);
  const item = await getActiveCaseBySlug(env.DB, slug, now);
  if (!item) return notFound();

  const voterHash = await hmacHash(requireSecret(env.HMAC_SECRET, "HMAC_SECRET"), "voter", deviceId);
  await consumeUsage(env.DB, "vote", voterHash, now);
  const results = await env.DB.batch([
    env.DB
      .prepare(
        `INSERT INTO votes (case_id, voter_hash, choice, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(case_id, voter_hash) DO UPDATE SET
           choice = excluded.choice,
           updated_at = excluded.updated_at
         WHERE votes.choice <> excluded.choice`,
      )
      .bind(item.id, voterHash, choice, now, now),
    env.DB
      .prepare(
        `UPDATE cases SET
           guilty_votes = (SELECT COUNT(*) FROM votes WHERE case_id = cases.id AND choice = 'guilty'),
           not_guilty_votes = (SELECT COUNT(*) FROM votes WHERE case_id = cases.id AND choice = 'not-guilty')
         WHERE id = ? AND status = 'active' AND expires_at > ?`,
      )
      .bind(item.id, now),
    env.DB
      .prepare(
        `SELECT votes.choice, cases.guilty_votes, cases.not_guilty_votes
         FROM cases
         INNER JOIN votes ON votes.case_id = cases.id AND votes.voter_hash = ?
         WHERE cases.id = ? AND cases.status = 'active' AND cases.expires_at > ?
         LIMIT 1`,
      )
      .bind(voterHash, item.id, now),
  ]);

  const updated = results[2].results[0] as VoteResultRow | undefined;
  if (!updated) return notFound();
  return json({
    choice: updated.choice,
    votes: { guilty: updated.guilty_votes, notGuilty: updated.not_guilty_votes },
    changed: results[0].meta.changes > 0,
  });
}
