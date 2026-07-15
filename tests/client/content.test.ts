import { describe, expect, it } from "vitest";
import { validatePublicStatement } from "../../src/server/security/content";

describe("public content guard", () => {
  it("accepts a plain privacy-safe sentence", () => {
    expect(validatePublicStatement("버스 줄을 오래 섰는데 누군가 새치기했다.")).toContain("새치기");
  });

  it.each([
    "연락처는 010-1234-5678이다",
    "https://example.com 여기 봐",
    "서울로 123-45번지로 찾아와",
    "**굵게** 공개한다",
    "찾아가서 가만두지 않겠다",
  ])("blocks sensitive or unsafe content: %s", (text) => {
    expect(() => validatePublicStatement(text)).toThrow();
  });
});
