import type { PublicCase, VerdictAnalysis, VerdictResult } from "../../shared/contracts";

export interface CaseRow {
  id: string;
  slug: string;
  public_statement: string;
  category: string;
  analysis_json: string;
  verdict_code: string;
  verdict_score: number;
  verdict_json: string;
  engine_version: string;
  status: "active" | "hidden";
  guilty_votes: number;
  not_guilty_votes: number;
  report_count: number;
  created_at: number;
  expires_at: number;
}

const CASE_COLUMNS = `id, slug, public_statement, category, analysis_json, verdict_code,
  verdict_score, verdict_json, engine_version, status, guilty_votes,
  not_guilty_votes, report_count, created_at, expires_at`;

export interface InsertCaseRecord {
  id: string;
  slug: string;
  publicStatement: string;
  analysis: VerdictAnalysis;
  verdict: VerdictResult;
  creatorHash: string;
  idempotencyHash: string;
  createdAt: number;
  expiresAt: number;
}

export async function getActiveCaseBySlug(db: D1Database, slug: string, now: number): Promise<CaseRow | null> {
  return db
    .prepare(`SELECT ${CASE_COLUMNS} FROM cases WHERE slug = ? AND status = 'active' AND expires_at > ? LIMIT 1`)
    .bind(slug, now)
    .first<CaseRow>();
}

export async function getCaseByIdempotencyHash(db: D1Database, hash: string): Promise<CaseRow | null> {
  return db.prepare(`SELECT ${CASE_COLUMNS} FROM cases WHERE idempotency_hash = ? LIMIT 1`).bind(hash).first<CaseRow>();
}

export async function insertCase(db: D1Database, record: InsertCaseRecord): Promise<void> {
  await db
    .prepare(
      `INSERT INTO cases (
        id, slug, public_statement, category, analysis_json, verdict_code,
        verdict_score, verdict_json, engine_version, status, guilty_votes,
        not_guilty_votes, report_count, creator_hash, idempotency_hash,
        created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, 0, 0, ?, ?, ?, ?)`,
    )
    .bind(
      record.id,
      record.slug,
      record.publicStatement,
      record.analysis.category,
      JSON.stringify(record.analysis),
      record.verdict.code,
      record.verdict.score,
      JSON.stringify(record.verdict),
      record.verdict.engineVersion,
      record.creatorHash,
      record.idempotencyHash,
      record.createdAt,
      record.expiresAt,
    )
    .run();
}

export function toPublicCase(row: CaseRow): PublicCase {
  return {
    slug: row.slug,
    publicStatement: row.public_statement,
    analysis: JSON.parse(row.analysis_json) as VerdictAnalysis,
    verdict: JSON.parse(row.verdict_json) as VerdictResult,
    votes: { guilty: row.guilty_votes, notGuilty: row.not_guilty_votes },
    createdAt: new Date(row.created_at * 1000).toISOString(),
    expiresAt: new Date(row.expires_at * 1000).toISOString(),
  };
}
