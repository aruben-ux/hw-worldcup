import { describe, expect, it } from "vitest";
import { liveMinute } from "./liveMinute";
import type { MatchResult } from "./types";

const KICKOFF = "2026-06-20T18:00:00Z";
const at = (mins: number) => Date.parse(KICKOFF) + mins * 60_000;

const R = (overrides: Partial<MatchResult> = {}): MatchResult => ({
  matchId: "m01",
  status: "live",
  outcome: null,
  score: null,
  utcDate: KICKOFF,
  minute: null,
  ...overrides,
});

describe("liveMinute", () => {
  it("prefers the API minute when present", () => {
    expect(liveMinute(R({ minute: "63" }), at(10))).toBe("63′");
  });

  it("falls back to LIVE without kickoff time", () => {
    expect(liveMinute(R({ utcDate: undefined }), at(10))).toBe("LIVE");
  });

  it("first half is wall-clock exact", () => {
    expect(liveMinute(R(), at(0.5))).toBe("1′");
    expect(liveMinute(R(), at(12.7))).toBe("12′");
    expect(liveMinute(R(), at(45))).toBe("45′");
  });

  it("first-half stoppage then half-time window", () => {
    expect(liveMinute(R(), at(47))).toBe("45+′");
    expect(liveMinute(R(), at(55))).toBe("HT");
    expect(liveMinute(R(), at(62))).toBe("HT");
  });

  it("second half is approximate, capped at 90+", () => {
    expect(liveMinute(R(), at(63))).toBe("~47′");
    expect(liveMinute(R(), at(80))).toBe("~64′");
    expect(liveMinute(R(), at(106))).toBe("90+′");
    expect(liveMinute(R(), at(125))).toBe("90+′");
  });
});
