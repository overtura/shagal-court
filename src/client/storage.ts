import type { VerdictAnalysis, VerdictResult, VoteChoice } from "../shared/contracts";

const DEVICE_KEY = "shagal-court:device-id";
const HISTORY_KEY = "shagal-court:history:v1";
const PARTY_VOTES_KEY = "shagal-court:party-votes:v1";
const PUBLIC_VOTES_KEY = "shagal-court:public-votes:v1";
const HISTORY_LIMIT = 20;

export interface LocalHistoryEntry {
  id: string;
  originalStatement: string;
  analysis: VerdictAnalysis;
  verdict: VerdictResult;
  createdAt: string;
}

function randomId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${prefix}_${token}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getDeviceId(): string {
  const stored = localStorage.getItem(DEVICE_KEY);
  if (stored) return stored;
  const created = randomId("device");
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

export function createIdempotencyKey(): string {
  return randomId("publish");
}

export function saveLocalHistory(entry: Omit<LocalHistoryEntry, "id" | "createdAt">): LocalHistoryEntry {
  const created: LocalHistoryEntry = { ...entry, id: randomId("case"), createdAt: new Date().toISOString() };
  const history = readJson<LocalHistoryEntry[]>(HISTORY_KEY, []);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([created, ...history].slice(0, HISTORY_LIMIT)));
  return created;
}

export function getLocalHistory(): LocalHistoryEntry[] {
  return readJson<LocalHistoryEntry[]>(HISTORY_KEY, []);
}

export function clearLocalHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function updatePartyVote(caseId: string, choice: VoteChoice): { guilty: number; notGuilty: number } {
  const votes = readJson<Record<string, { guilty: number; notGuilty: number }>>(PARTY_VOTES_KEY, {});
  const current = votes[caseId] ?? { guilty: 0, notGuilty: 0 };
  const next = choice === "guilty" ? { ...current, guilty: current.guilty + 1 } : { ...current, notGuilty: current.notGuilty + 1 };
  votes[caseId] = next;
  localStorage.setItem(PARTY_VOTES_KEY, JSON.stringify(votes));
  return next;
}

export function getPartyVotes(caseId: string): { guilty: number; notGuilty: number } {
  return readJson<Record<string, { guilty: number; notGuilty: number }>>(PARTY_VOTES_KEY, {})[caseId] ?? { guilty: 0, notGuilty: 0 };
}

export function rememberPublicVote(slug: string, choice: VoteChoice): void {
  const votes = readJson<Record<string, VoteChoice>>(PUBLIC_VOTES_KEY, {});
  votes[slug] = choice;
  localStorage.setItem(PUBLIC_VOTES_KEY, JSON.stringify(votes));
}

export function getRememberedPublicVote(slug: string): VoteChoice | null {
  return readJson<Record<string, VoteChoice>>(PUBLIC_VOTES_KEY, {})[slug] ?? null;
}
