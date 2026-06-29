import { describe, expect, it } from "vitest";
import {
  buildBracket,
  computeKnockoutStandings,
  liveProjection,
  slotPickers,
  titleRace,
} from "./knockout";
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

describe("slotPickers", () => {
  it("groups entrant names by their pick for a slot, skipping blanks, sorted", () => {
    const got = slotPickers(
      [
        { id: "a", name: "Zoe", picks: { "R32-1": "GER" } },
        { id: "b", name: "Amy", picks: { "R32-1": "GER" } },
        { id: "c", name: "Bob", picks: { "R32-1": "PAR" } },
        { id: "d", name: "Cy", picks: { "R32-1": "blank" } },
        { id: "e", name: "Di", picks: {} },
      ],
      "R32-1",
    );
    expect(got).toEqual({ GER: ["Amy", "Zoe"], PAR: ["Bob"] });
  });
});

describe("titleRace", () => {
  const players = [
    { id: "a", name: "Ann", picks: { "F-1": "FRA" } },
    { id: "b", name: "Bo", picks: { "F-1": "FRA" } },
    { id: "c", name: "Cy", picks: { "F-1": "BRA" } },
  ];

  it("groups by champion pick, sorted by backers", () => {
    const race = titleRace(players, []);
    expect(race.map((c) => [c.code, c.count])).toEqual([
      ["FRA", 2],
      ["BRA", 1],
    ]);
    expect(race[0].alive).toBe(true);
    expect(race[0].isChampion).toBe(false);
  });

  it("marks a backed team eliminated when it loses, alive-first ordering", () => {
    // R32-9 BRA/JPN: JPN beats BRA, so BRA (a title pick) is out.
    const race = titleRace(players, [fin("R32-9", "BRA", "JPN", "JPN")]);
    const bra = race.find((c) => c.code === "BRA")!;
    expect(bra.alive).toBe(false);
    expect(race[race.length - 1].code).toBe("BRA"); // sorts after alive picks
  });

  it("flags the actual champion once the final is decided", () => {
    const race = titleRace(players, [fin("F-1", "FRA", "ARG", "FRA")]);
    expect(race.find((c) => c.code === "FRA")!.isChampion).toBe(true);
  });
});

describe("liveProjection", () => {
  const live = (id: string, home: string, away: string, leader: string) => ({
    matchId: id,
    status: "live" as const,
    outcome: null,
    score: { home: 1, away: 0 },
    homeCode: home,
    awayCode: away,
    winnerCode: leader,
  });

  it("projects a climb from live points and a matching drop", () => {
    // Ann leads on banked points (2-1); Bo is winning two live matches.
    const standings = computeKnockoutStandings(
      [
        { id: "a", name: "Ann", picks: { "R32-1": "GER", "R32-2": "FRA" } },
        { id: "b", name: "Bo", picks: { "R32-1": "GER", "R32-9": "BRA", "R32-10": "NOR" } },
      ],
      [
        fin("R32-1", "GER", "PAR", "GER"),
        fin("R32-2", "FRA", "SWE", "FRA"),
        live("R32-9", "BRA", "JPN", "BRA"),
        live("R32-10", "CIV", "NOR", "NOR"),
      ],
    );
    expect(standings.find((r) => r.id === "a")!.rank).toBe(1); // banked
    const proj = liveProjection(standings);
    // Bo (1 + 2 live = 3) projects 1st (up 1); Ann (2) drops to 2nd.
    expect(proj.get("b")).toEqual({ projectedRank: 1, delta: 1 });
    expect(proj.get("a")).toEqual({ projectedRank: 2, delta: -1 });
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

  it("scores the third-place winner (6) and participants (4 each)", () => {
    expect(knockoutById.get("3P-1")).toBeTruthy();
    // Semifinals decided: SF-1 ARG beat BRA (loser BRA), SF-2 FRA beat
    // ESP (loser ESP). Third-place match: BRA beat ESP.
    const results = [
      fin("SF-1", "ARG", "BRA", "ARG"),
      fin("SF-2", "FRA", "ESP", "FRA"),
      fin("3P-1", "BRA", "ESP", "BRA"),
    ];
    const rows = computeKnockoutStandings(
      [
        // Both participants right (BRA, ESP = the SF losers) + winner BRA
        { id: "a", name: "Ann", picks: { "3P-A": "BRA", "3P-B": "ESP", "3P-1": "BRA" } },
        // One participant right, winner wrong
        { id: "b", name: "Bo", picks: { "3P-A": "BRA", "3P-B": "GER", "3P-1": "ESP" } },
      ],
      results,
    );
    const ann = rows.find((r) => r.id === "a")!;
    const bo = rows.find((r) => r.id === "b")!;
    expect(ann.points).toBe(4 + 4 + 6); // both participants + winner
    expect(bo.points).toBe(4); // one participant only
  });

  it("treats blank/unresolved picks as no pick (no points, no max)", () => {
    const rows = computeKnockoutStandings(
      [{ id: "a", name: "Ann", picks: { "R32-1": "blank", "F-1": "UNRESOLVED" } }],
      [],
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
