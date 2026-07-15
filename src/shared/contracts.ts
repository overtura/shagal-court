export const DISCLAIMER = "이 판결은 밈입니다. 실제 법률 판단이나 법률 조언이 아닙니다.";
export const ENGINE_VERSION = "shagal-verdict-1.0.0";
export const MAX_STATEMENT_LENGTH = 180;

export const CATEGORIES = [
  "직장·업무",
  "돈·거래",
  "교통·공공예절",
  "인간관계",
  "연애·약속",
  "서비스·기계",
  "대기·일정",
  "순수 황당",
] as const;

export type CaseCategory = (typeof CATEGORIES)[number];
export type MemeVerdict =
  | "shagal-guilty"
  | "mitigated"
  | "insufficient"
  | "shagal-not-guilty";

export interface VerdictAnalysis {
  category: CaseCategory;
  unfairness: number;
  absurdity: number;
  otherResponsibility: number;
  harm: number;
  misunderstanding: number;
  mitigation: number;
  confidence: number;
}

export interface VerdictResult {
  code: MemeVerdict;
  score: number;
  title: string;
  summary: string;
  reasons: string[];
  disclaimer: typeof DISCLAIMER;
  engineVersion: typeof ENGINE_VERSION;
}

export interface PublicCase {
  slug: string;
  publicStatement: string;
  analysis: VerdictAnalysis;
  verdict: VerdictResult;
  votes: { guilty: number; notGuilty: number };
  createdAt: string;
  expiresAt: string;
}

export interface CreateCaseRequest {
  publicStatement: string;
  analysis: VerdictAnalysis;
  deviceId: string;
  idempotencyKey: string;
  consent: true;
  turnstileToken?: string;
}

export type VoteChoice = "guilty" | "not-guilty";
export type ReportReason = "personal-info" | "threat" | "hate" | "spam" | "other";

export interface VoteRequest {
  choice: VoteChoice;
  deviceId: string;
}

export interface ReportRequest {
  reason: ReportReason;
  deviceId: string;
}

export interface ApiProblem {
  error: { code: string; message: string };
}
