import { describe, expect, it } from "vitest";
import { decideCadence, evaluateMergeGate, validateMajorChange, type PullRequestRecord } from "../../maintainer-bot/cadence";

const merged = (number: number, label: "size:small" | "size:major", extra: string[] = []): PullRequestRecord => ({
  number, mergedAt: new Date(2026, 0, number).toISOString(), labels: ["self-improvement", label, ...extra], state: "MERGED",
});

describe("five-PR self-improvement cadence", () => {
  it("starts with small when no history exists", () => {
    expect(decideCadence([])).toMatchObject({ nextSize: "small", mergedSmallSinceMajor: 0 });
  });

  it("requires major after four merged small improvements", () => {
    expect(decideCadence([1, 2, 3, 4].map((number) => merged(number, "size:small")))).toMatchObject({ nextSize: "major", mergedSmallSinceMajor: 4 });
  });

  it("keeps major due when an attempted major is open, closed, or draft", () => {
    const history = [1, 2, 3, 4].map((number) => merged(number, "size:small"));
    history.push({ number: 5, mergedAt: null, labels: ["self-improvement", "size:major"], state: "CLOSED", isDraft: true });
    expect(decideCadence(history).nextSize).toBe("major");
  });

  it("excludes forced override small PRs from cadence", () => {
    const history = [1, 2, 3].map((number) => merged(number, "size:small"));
    history.push(merged(4, "size:small", ["cadence:override"]));
    expect(decideCadence(history)).toMatchObject({ nextSize: "small", mergedSmallSinceMajor: 3 });
  });

  it("resets only after a major really merges", () => {
    const history = [1, 2, 3, 4].map((number) => merged(number, "size:small"));
    history.push(merged(5, "size:major"));
    expect(decideCadence(history)).toMatchObject({ nextSize: "small", mergedSmallSinceMajor: 0 });
  });
});

describe("major merge fixtures", () => {
  const baseGate = {
    draft: false, risk: "r2" as const, changedPaths: ["src/client/pages/SharedCase.tsx", "src/shared/verdict-engine.ts", "e2e/court-flow.spec.ts"],
    deniedPatterns: [/^migrations\//, /^src\/server\/security\//], verifyPassed: true, browserPassed: true,
    regressionTestsPassed: true, redTeamPassed: true, unresolvedThreads: 0, productionDependenciesAdded: 0,
    docsMatch: true, acceptanceCriteriaPassed: true, size: "major" as const,
  };

  it("allows a fully verified major-safe fixture", () => {
    expect(evaluateMergeGate(baseGate)).toEqual({ allowed: true, reasons: [] });
  });

  it("blocks a protected change even when it is small", () => {
    const result = evaluateMergeGate({ ...baseGate, changedPaths: ["src/server/security/identity.ts"] });
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("a protected path changed");
  });

  it("blocks documentation-only major results and over-budget output", () => {
    expect(validateMajorChange(["docs/PRODUCT.md", "README.md"], 1600)).toEqual(expect.arrayContaining([
      "major changes cannot be documentation-only", "major line budget exceeded", "major changes require a new test or E2E scenario",
    ]));
  });
});
