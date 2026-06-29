import { describe, expect, it } from "vitest";
import { buildBracket, computeKnockoutStandings } from "./knockout";
import { knockoutById } from "./data";
import type { KnockoutParticipant, MatchResult } from "./types";

// Helper: a finished result for a knockout slot, winner by code.
function fin(
  slotId: string,
  home: string,
  away: string,
  winner: string,
  score: [number, number] = [1, 0],
): MatchResult {
  return {
    matchId: slotId,
    status: "finished",
    outcome: null,
    score: { home: score[0], away: score[1] },
    homeCode: home,
    awayCode: away,
    winnerCode: winner,
  };
}

const apiId = (slotId: string) => knockoutById.get(slotId)!.apiMatchId;

describe("buildBracket", () => {
  it("seeds R32 from data and records decided winners", () => {
    const slots = buildBracket([fin("R32-3", "RSA", "CAN", "CAN")]);
    const r32_3 = slots.get("R32-3")!;
    expect([r32_3.home, r32_3.away]).toEqual(["RSA", "CAN"]);
    expect(r32_3.winner).toBe("CAN");
  });

  it("propagates a penalty winner (1-1 but winnerCode set) into the next round", () => {
    // R32-3 feeds R16-2 home side per the bracket topology.
    const slots = buildBracket([fin("R32-3", "RSA", "CAN", "CAN", [1, 1])]);
    expect(slots.get("R16-2")!.home).toBe("CAN");
  });

  it("does not advance anyone while a match is live", () => {
    const live: MatchResult = {
      matchId: "R32-3",
      status: "live",
      outcome: null,
      score: { home: 1, away: 0 },
      homeCode: "RSA",
      awayCode: "CAN",
      winnerCode: "RSA",
    };
    const slots = buildBracket([live]);
    expect(slots.get("R32-3")!.winner).toBeNull();
    expect(slots.get("R16-2")!.home).toBeNull();
  });
});

describe("computeKnockoutStandings", () => {
  const players: KnockoutParticipant[] = [
    { id: "a", name: "Ann", picks: { "R32-3": "CAN", "R16-2": "CAN" } },
    { id: "b", name: "Bo", picks: { "R32-3": "RSA", "R16-2": "RSA" } },
  ];

  it("awards round-weighted points only for the correct winner", () => {
    const rows = computeKnockoutStandings(players, [
      fin("R32-3", "RSA", "CAN", "CAN"),
    ]);
    const ann = rows.find((r) => r.id === "a")!;
    const bo = rows.find((r) => r.id === "b")!;
    expect(ann.points).toBe(1); // R32 = 1, correct
    expect(bo.points).toBe(0); // wrong
    expect(bo.wrong).toBe(1);
  });

  it("drops max-possible for picks whose team is eliminated", () => {
    // CAN beat RSA. Bo had RSA winning R16-2 too — now impossible.
    const rows = computeKnockoutStandings(players, [
      fin("R32-3", "RSA", "CAN", "CAN"),
    ]);
    const bo = rows.find((r) => r.id === "b")!;
    // R16-2 pick RSA is eliminated -> not counted in max
    expect(bo.maxPossible).toBe(0);
    const ann = rows.find((r) => r.id === "a")!;
    // Ann: 1 banked + R16-2 (CAN still alive, 2 pts) reachable = 3
    expect(ann.maxPossible).toBe(3);
  });

  it("ranks by points with ties sharing a rank", () => {
    const rows = computeKnockoutStandings(
      [
        { id: "a", name: "Ann", picks: { "R32-3": "CAN" } },
        { id: "b", name: "Bea", picks: { "R32-3": "CAN" } },
        { id: "c", name: "Cy", picks: { "R32-3": "RSA" } },
      ],
      [fin("R32-3", "RSA", "CAN", "CAN")],
    );
    expect(rows.map((r) => [r.name, r.rank, r.points])).toEqual([
      ["Ann", 1, 1],
      ["Bea", 1, 1],
      ["Cy", 3, 0],
    ]);
  });

  it("third-place match is not scored", () => {
    expect(knockoutById.get("3P-1")).toBeTruthy();
    const rows = computeKnockoutStandings(
      [{ id: "a", name: "Ann", picks: { "3P-1": "BRA" } }],
      [fin("3P-1", "BRA", "FRA", "BRA")],
    );
    expect(rows[0].points).toBe(0);
    expect(rows[0].maxPossible).toBe(0);
  });

  it("counts provisional live points separately from banked points", () => {
    const live: MatchResult = {
      matchId: "R32-3",
      status: "live",
      outcome: null,
      score: { home: 0, away: 1 },
      homeCode: "RSA",
      awayCode: "CAN",
      winnerCode: "CAN",
    };
    const rows = computeKnockoutStandings(players, [live]);
    const ann = rows.find((r) => r.id === "a")!;
    expect(ann.points).toBe(0);
    expect(ann.livePoints).toBe(1);
    expect(apiId("R32-3")).toBeGreaterThan(0);
  });
});
