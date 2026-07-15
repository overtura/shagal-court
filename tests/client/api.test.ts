import { describe, expect, it, vi } from "vitest";
import { publishCase } from "../../src/client/api";
import { createLocalVerdict } from "../../src/shared/verdict-engine";

describe("public API boundary", () => {
  it("sends only the reviewed public statement and analysis", async () => {
    const { analysis } = createLocalVerdict("원문에는 로컬 비밀 문장이 있다.");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ case: {}, url: "/case/example", reused: false }), {
      status: 201,
      headers: { "content-type": "application/json" },
    }));
    await publishCase({
      publicStatement: "누군가 약속을 갑자기 취소했다.", analysis,
      deviceId: "device_abcdefghijklmnopqrstuvwxyz", idempotencyKey: "publish_abcdefghijklmnop", consent: true,
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<string, unknown>;
    expect(body.publicStatement).toBe("누군가 약속을 갑자기 취소했다.");
    expect(body).not.toHaveProperty("originalStatement");
    expect(JSON.stringify(body)).not.toContain("로컬 비밀");
  });
});
