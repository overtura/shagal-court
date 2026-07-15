import { afterEach, describe, expect, it, vi } from "vitest";
import { publishCase } from "../../src/client/api";
import { createLocalVerdict } from "../../src/shared/verdict-engine";

describe("public API boundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends only the reviewed public statement and analysis", async () => {
    const { analysis } = createLocalVerdict("원문에는 로컬 비밀 문장이 있다.");
    const slug = "example_slug_123";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ case: { slug }, url: `/case/${slug}`, reused: false }), {
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

  it("rejects a share URL outside the expected case path", async () => {
    const { analysis } = createLocalVerdict("공유 주소 검증용 사건이다.");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      case: { slug: "example_slug_123" },
      url: "https://example.invalid/case/example_slug_123",
      reused: false,
    }), { status: 201, headers: { "content-type": "application/json" } }));

    await expect(publishCase({
      publicStatement: "공유 주소 검증용 공개 문장이다.", analysis,
      deviceId: "device_abcdefghijklmnopqrstuvwxyz", idempotencyKey: "publish_abcdefghijklmnop", consent: true,
    })).rejects.toMatchObject({ code: "invalid_response", status: 502 });
  });
});
