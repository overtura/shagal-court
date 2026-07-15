export type ImprovementSize = "small" | "major";

export interface PullRequestRecord {
  number: number;
  mergedAt: string | null;
  labels: string[];
  isDraft?: boolean;
  state?: string;
}

export interface CadenceDecision {
  nextSize: ImprovementSize;
  mergedSmallSinceMajor: number;
  countedPullRequests: number[];
  reason: string;
}

function hasLabel(record: PullRequestRecord, label: string): boolean {
  return record.labels.includes(label);
}

export function decideCadence(records: readonly PullRequestRecord[]): CadenceDecision {
  const merged = records
    .filter((record) => Boolean(record.mergedAt) && hasLabel(record, "self-improvement") && !hasLabel(record, "cadence:override"))
    .filter((record) => hasLabel(record, "size:small") || hasLabel(record, "size:major"))
    .sort((left, right) => String(left.mergedAt).localeCompare(String(right.mergedAt)));

  let mergedSmallSinceMajor = 0;
  for (const record of merged) {
    if (hasLabel(record, "size:major")) mergedSmallSinceMajor = 0;
    else if (hasLabel(record, "size:small")) mergedSmallSinceMajor += 1;
  }
  const nextSize: ImprovementSize = mergedSmallSinceMajor >= 4 ? "major" : "small";
  return {
    nextSize,
    mergedSmallSinceMajor,
    countedPullRequests: merged.map(({ number }) => number),
    reason: nextSize === "major"
      ? `${mergedSmallSinceMajor} small improvements have merged since the latest major; the major slot remains due until a major merges.`
      : `${mergedSmallSinceMajor} of 4 small improvements have merged in the current cadence.`,
  };
}

export interface MergeGateInput {
  draft: boolean;
  risk: "r1" | "r2" | "r3";
  changedPaths: string[];
  deniedPatterns: RegExp[];
  verifyPassed: boolean;
  browserPassed: boolean;
  regressionTestsPassed: boolean;
  redTeamPassed: boolean;
  unresolvedThreads: number;
  productionDependenciesAdded: number;
  docsMatch: boolean;
  acceptanceCriteriaPassed: boolean;
  size: ImprovementSize;
}

export function evaluateMergeGate(input: MergeGateInput): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.draft) reasons.push("pull request is draft");
  if (input.risk === "r3") reasons.push("risk:r3 requires human review");
  if (input.changedPaths.some((path) => input.deniedPatterns.some((pattern) => pattern.test(path)))) reasons.push("a protected path changed");
  if (!input.verifyPassed) reasons.push("pnpm verify failed");
  if (!input.browserPassed) reasons.push("browser verification failed");
  if (!input.regressionTestsPassed) reasons.push("regression or new behavior tests failed");
  if (!input.redTeamPassed) reasons.push("Codex red-team did not pass");
  if (input.unresolvedThreads > 0) reasons.push("review threads remain unresolved");
  if (input.productionDependenciesAdded > 0) reasons.push("a production dependency was added without prior approval");
  if (!input.docsMatch) reasons.push("documentation does not match implementation");
  if (input.size === "major" && !input.acceptanceCriteriaPassed) reasons.push("major acceptance criteria are incomplete");
  return { allowed: reasons.length === 0, reasons };
}

export function validateMajorChange(changedPaths: readonly string[], changedLines: number): string[] {
  const reasons: string[] = [];
  const docsOnly = changedPaths.length > 0 && changedPaths.every((path) => path === "README.md" || path === "AGENTS.md" || path.startsWith("docs/"));
  if (docsOnly) reasons.push("major changes cannot be documentation-only");
  if (changedPaths.length > 22) reasons.push("major file budget exceeded");
  if (changedLines > 1500) reasons.push("major line budget exceeded");
  if (!changedPaths.some((path) => path.startsWith("tests/") || path.startsWith("e2e/"))) reasons.push("major changes require a new test or E2E scenario");
  return reasons;
}
