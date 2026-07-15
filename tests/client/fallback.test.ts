import { describe, expect, it } from "vitest";
import { analyzeLocally } from "../../src/client/ai/verdict-client";

describe("local model fallback", () => {
  it("returns a deterministic verdict without starting a model worker", async () => {
    window.history.replaceState({}, "", "/?model=off");
    const first = await analyzeLocally("예약 시간에 갔는데 문이 닫혀 있었다.");
    const second = await analyzeLocally("예약 시간에 갔는데 문이 닫혀 있었다.");
    expect(first.modelMode).toBe("fallback");
    expect(first.verdict).toEqual(second.verdict);
  });

  it("falls back immediately when the browser reports offline", async () => {
    window.history.replaceState({}, "", "/");
    const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, "onLine");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    try {
      const result = await analyzeLocally("인터넷이 끊긴 상태에서도 판결은 계속된다.");
      expect(result.modelMode).toBe("fallback");
    } finally {
      if (originalDescriptor) Object.defineProperty(navigator, "onLine", originalDescriptor);
      else Reflect.deleteProperty(navigator, "onLine");
    }
  });
});
