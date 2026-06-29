import { knockoutMatches, roundPoints } from "./data";
import type {
  KnockoutMatch,
  KnockoutParticipant,
  MatchResult,
  RoundKey,
  StandingRow,
} from "./types";

export const ROUND_ORDER: RoundKey[] = ["R32", "R16", "QF", "SF", "F", "3P"];

export interface BracketSlot {
  match: KnockoutMatch;
  home: string | null;
  away: string | null;
  result: MatchResult | undefined;
  /** Winning team code, decided matches only (null while live/scheduled). */
  winner: string | null;
}

/**
 * Resolve the live bracket: fill each slot's two teams (API codes when
 * known, else propagated from decided feeder matches) and record decided
 * winners. Processed in round order so winners cascade forward in one pass.
 */
export function buildBracket(results: MatchResult[]): Map<string, BracketSlot> {
  const byId = new Map(results.map((r) => [r.matchId, r]));
  const slots = new Map<string, BracketSlot>();
  for (const m of knockoutMatches) {
    const res = byId.get(m.id);
    slots.set(m.id, {
      match: m,
      home: res?.homeCode ?? m.home,
      away: res?.awayCode ?? m.away,
      result: res,
      winner: null,
    });
  }

  for (const rk of ROUND_ORDER) {
    for (const slot of slots.values()) {
      if (slot.match.round !== rk) continue;
      const res = slot.result;
      const winner =
        res?.status === "finished" &&
        res.winnerCode &&
        res.winnerCode !== "DRAW"
          ? res.winnerCode
          : null;
      slot.winner = winner;
      if (!winner) continue;

      const advance = (
        destId: string | null | undefined,
        side: "home" | "away" | null | undefined,
        team: string | null,
      ) => {
        if (!destId || !side || !team) return;
        const dest = slots.get(destId);
        if (!dest) return;
        // Don't override a team the API already placed.
        if (side === "home" && dest.home == null) dest.home = team;
        if (side === "away" && dest.away == null) dest.away = team;
      };

      advance(slot.match.feedsInto, slot.match.feedsSide, winner);
      if (slot.match.loserFeedsInto && res) {
        const loser = winner === res.homeCode ? res.awayCode : res.homeCode;
        advance(slot.match.loserFeedsInto, slot.match.loserFeedsSide, loser ?? null);
      }
    }
  }
  return slots;
}

/** Teams eliminated by a decided knockout loss (for max-possible bounds). */
function eliminatedTeams(slots: Map<string, BracketSlot>): Set<string> {
  const out = new Set<string>();
  for (const slot of slots.values()) {
    const res = slot.result;
    if (slot.winner && res) {
      const loser = slot.winner === res.homeCode ? res.awayCode : res.homeCode;
      if (loser) out.add(loser);
    }
  }
  return out;
}

/**
 * Round-weighted bracket scoring: a pick scores its round's points only
 * if that team actually wins that specific bracket slot. Live matches
 * contribute provisional points (shown separately). maxPossible is an
 * optimistic bound — counts unfinished slots whose picked team is not
 * yet eliminated.
 */
export function computeKnockoutStandings(
  participants: KnockoutParticipant[],
  results: MatchResult[],
): StandingRow[] {
  const slots = buildBracket(results);
  const eliminated = eliminatedTeams(slots);

  const rows = participants.map((p) => {
    let points = 0;
    let livePoints = 0;
    let wrong = 0;
    let pending = 0;
    for (const slot of slots.values()) {
      const pts = roundPoints.get(slot.match.round) ?? 0;
      if (pts === 0) continue; // third-place match isn't scored
      const pick = p.picks[slot.match.id];
      if (!pick) continue;
      const res = slot.result;
      if (res?.status === "finished") {
        if (slot.winner && pick === slot.winner) points += pts;
        else wrong += pts;
      } else if (res?.status === "live") {
        if (!eliminated.has(pick)) pending += pts;
        if (res.winnerCode && res.winnerCode !== "DRAW" && pick === res.winnerCode)
          livePoints += pts;
      } else if (!eliminated.has(pick)) {
        pending += pts;
      }
    }
    return {
      id: p.id,
      name: p.name,
      rank: 0,
      points,
      livePoints,
      maxPossible: points + pending,
      correct: points,
      wrong,
      pending,
    };
  });

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.livePoints - a.livePoints ||
      b.maxPossible - a.maxPossible ||
      a.name.localeCompare(b.name),
  );
  let prevPoints = Number.NaN;
  let prevRank = 0;
  rows.forEach((row, i) => {
    if (row.points === prevPoints) {
      row.rank = prevRank;
    } else {
      row.rank = i + 1;
      prevRank = row.rank;
      prevPoints = row.points;
    }
  });
  return rows;
}
