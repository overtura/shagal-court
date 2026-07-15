import { describe, expect, it } from "vitest";
import { createLocalVerdict } from "../../src/shared/verdict-engine";
import { getDeviceId, getLocalHistory, getPartyVotes, saveLocalHistory, updatePartyVote } from "../../src/client/storage";

describe("private browser storage", () => {
  it("creates a stable random device id", () => {
    const first = getDeviceId();
    expect(first).toMatch(/^device_[A-Za-z0-9_-]{20,}$/);
    expect(getDeviceId()).toBe(first);
  });

  it("keeps original text in local history and party votes separate", () => {
    const result = createLocalVerdict("회사에서 갑자기 야근을 시켰다.");
    const entry = saveLocalHistory({ originalStatement: "회사에서 갑자기 야근을 시켰다.", ...result });
    expect(getLocalHistory()[0].originalStatement).toContain("야근");
    expect(updatePartyVote(entry.id, "guilty")).toEqual({ guilty: 1, notGuilty: 0 });
    expect(updatePartyVote(entry.id, "not-guilty")).toEqual({ guilty: 1, notGuilty: 1 });
    expect(getPartyVotes(entry.id)).toEqual({ guilty: 1, notGuilty: 1 });
  });
});
