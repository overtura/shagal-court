import type { ApiProblem, CreateCaseRequest, PublicCase, ReportReason, VoteChoice } from "../shared/contracts";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError("network_error", "서버에 연결할 수 없습니다. 로컬 판결은 그대로 보관됩니다.", 0);
  }
  const data = (await response.json().catch(() => null)) as T | ApiProblem | null;
  if (!response.ok) {
    const problem = data as ApiProblem | null;
    throw new ApiError(problem?.error?.code ?? "request_failed", problem?.error?.message ?? "요청을 처리하지 못했습니다.", response.status);
  }
  return data as T;
}

export function publishCase(request: CreateCaseRequest): Promise<{ case: PublicCase; url: string; reused: boolean }> {
  return apiFetch("/api/cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
}

export function fetchCase(slug: string): Promise<{ case: PublicCase }> {
  return apiFetch(`/api/cases/${encodeURIComponent(slug)}`);
}

export function castVote(slug: string, choice: VoteChoice, deviceId: string): Promise<{ choice: VoteChoice; votes: PublicCase["votes"]; changed: boolean }> {
  return apiFetch(`/api/cases/${encodeURIComponent(slug)}/vote`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ choice, deviceId }),
  });
}

export function sendReport(slug: string, reason: ReportReason, deviceId: string): Promise<{ accepted: boolean; duplicate: boolean }> {
  return apiFetch(`/api/cases/${encodeURIComponent(slug)}/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason, deviceId }),
  });
}
