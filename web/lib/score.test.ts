import { describe, expect, it } from "vitest";
import { computeStandings, pickDistribution } from "./score";
import type { MatchResult, Participant } from "./types";

const P = (id: string, picks: Participant["picks"]): Participant => ({
  id,
  page: 1,
  name: id,
  picks,
});

const R = (
  matchId: string,
  status: MatchResult["status"],
  outcome: MatchResult["outcome"],
): MatchResult => ({ matchId, status, outcome, score: null });

describe("computeStandings", () => {
  it("scores 1 point per correct finished pick", () => {
    const rows = computeStandings(
      [P("a", { m01: "home", m02: "draw", m03: "away" })],
      [R("m01", "finished", "home"), R("m02", "finished", "draw"), R("m03", "finished", "home")],
    );
    expect(rows[0].points).toBe(2);
    expect(rows[0].wrong).toBe(1);
    expect(rows[0].maxPossible).toBe(2); // nothing left to play
  });

  it("blank and unresolved picks never score and reduce maxPossible", () => {
    const rows = computeStandings(
      [P("a", { m01: "blank", m02: "unresolved", m03: "home" })],
      [R("m01", "finished", "home")],
    );
    expect(rows[0].points).toBe(0);
    expect(rows[0].maxPossible).toBe(1); // only m03 still winnable
  });

  it("live matches give provisional points only", () => {
    const rows = computeStandings(
      [P("a", { m01: "home", m02: "away" })],
      [R("m01", "live", "home"), R("m02", "live", "home")],
    );
    expect(rows[0].points).toBe(0);
    expect(rows[0].livePoints).toBe(1);
    expect(rows[0].maxPossible).toBe(2); // both could still land right
  });

  it("scheduled / missing results count as pending", () => {
    const rows = computeStandings(
      [P("a", { m01: "home", m02: "draw" })],
      [R("m01", "scheduled", null)],
    );
    expect(rows[0].points).toBe(0);
    expect(rows[0].pending).toBe(2);
    expect(rows[0].maxPossible).toBe(2);
  });

  it("ranks with standard competition ties (1,1,3)", () => {
    const results = [R("m01", "finished", "home"), R("m02", "finished", "draw")];
    const rows = computeStandings(
      [
        P("a", { m01: "home", m02: "draw" }),
        P("b", { m01: "home", m02: "draw" }),
        P("c", { m01: "away", m02: "draw" }),
      ],
      results,
    );
    expect(rows.map((r) => [r.id, r.rank, r.points])).toEqual([
      ["a", 1, 2],
      ["b", 1, 2],
      ["c", 3, 1],
    ]);
  });
});

describe("pickDistribution", () => {
  it("counts picks per outcome including no-picks", () => {
    const dist = pickDistribution(
      [
        P("a", { m01: "home" }),
        P("b", { m01: "home" }),
        P("c", { m01: "draw" }),
        P("d", { m01: "blank" }),
      ],
      "m01",
    );
    expect(dist).toEqual({ home: 2, draw: 1, away: 0, none: 1 });
  });
});
