import { describe, expect, it } from "vitest";
import { DISCLAIMER } from "../../src/shared/contracts";
import { analyzeStatement, calculateVerdict, createLocalVerdict, normalizeStatement } from "../../src/shared/verdict-engine";

describe("verdict engine", () => {
  it("normalizes and produces the same result for the same input", () => {
    const text = "  퇴근  5분 전에 상사가 일을 줬다!  ";
    expect(normalizeStatement(text)).toBe("퇴근 5분 전에 상사가 일을 줬다!");
    expect(createLocalVerdict(text)).toEqual(createLocalVerdict(text));
  });

  it("classifies category and keeps all axes bounded", () => {
    const analysis = analyzeStatement("버스 줄을 오래 섰는데 세 명이 새치기했다!!!", [0.3, -0.2, 0.4, 0.1]);
    expect(analysis.category).toBe("교통·공공예절");
    for (const value of Object.values(analysis).filter((item): item is number => typeof item === "number")) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("always returns the meme disclaimer without legal claims", () => {
    const result = calculateVerdict(analyzeStatement("친구가 약속을 취소하고 연락을 안 했다."));
    expect(result.disclaimer).toBe(DISCLAIMER);
    expect(JSON.stringify(result)).not.toMatch(/형량|벌금|고소 가능|범죄 성립|법 조항/);
  });
});
