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
export function eliminatedTeams(slots: Map<string, BracketSlot>): Set<string> {
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

/** Points for correctly predicting each of the two third-place-match
 * participants (the semifinal losers). The third-place winner is scored
 * as the 3P round's points (6). */
export const THIRD_PLACE_PARTICIPANT_POINTS = 4;

/** A real team pick, or null for blank/unresolved entries. */
export const realPick = (v: string | undefined): string | null =>
  !v || v === "blank" || v === "UNRESOLVED" ? null : v;

/**
 * For one bracket slot, group entrants by the team they picked to win it:
 * team code -> sorted list of entrant names. Blank/unresolved picks are
 * skipped.
 */
export function slotPickers(
  participants: KnockoutParticipant[],
  slotId: string,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const p of participants) {
    const code = realPick(p.picks[slotId]);
    if (!code) continue;
    (out[code] ??= []).push(p.name);
  }
  for (const names of Object.values(out)) names.sort((a, b) => a.localeCompare(b));
  return out;
}

const loserOf = (slot: BracketSlot): string | null => {
  const res = slot.result;
  if (!slot.winner || !res) return null;
  return slot.winner === res.homeCode ? (res.awayCode ?? null) : (res.homeCode ?? null);
};

/**
 * Bracket scoring with the printed sheet's point values (round points
 * come from data/knockout.json: R32=1, R16=2, QF=3, SF=5, champion=7,
 * third-place winner=6) plus 4 points per correctly predicted
 * third-place participant. A pick scores only if that team wins that
 * specific bracket slot. Live matches contribute provisional points
 * (shown separately). maxPossible is an optimistic ceiling.
 */
export function computeKnockoutStandings(
  participants: KnockoutParticipant[],
  results: MatchResult[],
): StandingRow[] {
  const slots = buildBracket(results);
  const eliminated = eliminatedTeams(slots);

  // Teams knocked out before the semifinals can't reach the third-place
  // match; semifinal winners (finalists) can't either.
  const bustedEarly = new Set<string>();
  for (const slot of slots.values()) {
    if (["R32", "R16", "QF"].includes(slot.match.round)) {
      const l = loserOf(slot);
      if (l) bustedEarly.add(l);
    }
  }
  const sf1 = slots.get("SF-1")!;
  const sf2 = slots.get("SF-2")!;
  const finalists = new Set([sf1.winner, sf2.winner].filter(Boolean) as string[]);
  const sfLosers = [loserOf(sf1), loserOf(sf2)].filter(Boolean) as string[];
  const sfAllDecided = sf1.winner != null && sf2.winner != null;
  const tp = slots.get("3P-1");

  const rows = participants.map((p) => {
    let points = 0;
    let livePoints = 0;
    let pending = 0;
    for (const slot of slots.values()) {
      if (slot.match.round === "3P") continue; // scored separately below
      const pts = roundPoints.get(slot.match.round) ?? 0;
      if (pts === 0) continue;
      const pick = realPick(p.picks[slot.match.id]);
      if (!pick) continue;
      const res = slot.result;
      if (res?.status === "finished") {
        if (slot.winner && pick === slot.winner) points += pts;
      } else if (res?.status === "live") {
        if (!eliminated.has(pick)) pending += pts;
        if (res.winnerCode && res.winnerCode !== "DRAW" && pick === res.winnerCode)
          livePoints += pts;
      } else if (!eliminated.has(pick)) {
        pending += pts;
      }
    }

    // Third-place participants (4 each): greedily match the two picks
    // against the actual semifinal losers; otherwise still winnable if
    // the team could yet drop into the third-place match.
    const partPicks = [realPick(p.picks["3P-A"]), realPick(p.picks["3P-B"])].filter(
      Boolean,
    ) as string[];
    const pool = [...sfLosers];
    const PP = THIRD_PLACE_PARTICIPANT_POINTS;
    for (const pick of partPicks) {
      const idx = pool.indexOf(pick);
      if (idx >= 0) {
        points += PP;
        pool.splice(idx, 1);
      } else if (!sfAllDecided && !bustedEarly.has(pick) && !finalists.has(pick)) {
        pending += PP;
      }
    }

    // Third-place winner (6).
    const tpPick = realPick(p.picks["3P-1"]);
    if (tpPick && tp) {
      const tpPts = roundPoints.get("3P") ?? 0;
      const res = tp.result;
      if (res?.status === "finished") {
        if (tp.winner && tpPick === tp.winner) points += tpPts;
      } else if (res?.status === "live") {
        const stillIn = sfAllDecided
          ? sfLosers.includes(tpPick)
          : !bustedEarly.has(tpPick) && !finalists.has(tpPick);
        if (stillIn) pending += tpPts;
        if (res.winnerCode && res.winnerCode !== "DRAW" && tpPick === res.winnerCode)
          livePoints += tpPts;
      } else {
        const stillIn = sfAllDecided
          ? sfLosers.includes(tpPick)
          : !bustedEarly.has(tpPick) && !finalists.has(tpPick);
        if (stillIn) pending += tpPts;
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
      wrong: 0,
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

/**
 * The round currently in focus: the earliest round (R32→…→F, ignoring
 * the third-place match) with a match not yet finished. Returns "F" once
 * everything is decided. Used as the bracket's default tab.
 */
export function currentKnockoutRound(results: MatchResult[]): RoundKey {
  const slots = buildBracket(results);
  for (const rk of ["R32", "R16", "QF", "SF", "F"] as RoundKey[]) {
    const roundSlots = [...slots.values()].filter((s) => s.match.round === rk);
    if (roundSlots.some((s) => s.result?.status !== "finished")) return rk;
  }
  return "F";
}

export interface TitleContender {
  code: string;
  count: number;
  names: string[];
  alive: boolean;
  isChampion: boolean;
}

/**
 * The champion race: entrants grouped by their title pick (F-1), each
 * team marked alive/eliminated, and the actual champion flagged once the
 * final is decided. Sorted by backers desc, alive first, then team code.
 */
export function titleRace(
  participants: KnockoutParticipant[],
  results: MatchResult[],
): TitleContender[] {
  const slots = buildBracket(results);
  const eliminated = eliminatedTeams(slots);
  const final = slots.get("F-1");
  const champion = final?.winner ?? null;
  const byTeam = slotPickers(participants, "F-1");

  return Object.entries(byTeam)
    .map(([code, names]) => ({
      code,
      names,
      count: names.length,
      alive: !eliminated.has(code),
      isChampion: champion === code,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        Number(b.alive) - Number(a.alive) ||
        a.code.localeCompare(b.code),
    );
}

export interface LiveMove {
  projectedRank: number;
  delta: number;
}

/**
 * Projected standings if current live results held: rank by
 * points + livePoints (same tiebreaks as the real ranking). delta is
 * current rank minus projected rank (positive = climbing).
 */
export function liveProjection(
  standings: StandingRow[],
): Map<string, LiveMove> {
  const proj = [...standings].sort(
    (a, b) =>
      b.points + b.livePoints - (a.points + a.livePoints) ||
      b.maxPossible - a.maxPossible ||
      a.name.localeCompare(b.name),
  );
  const out = new Map<string, LiveMove>();
  let prevTotal = Number.NaN;
  let prevRank = 0;
  proj.forEach((row, i) => {
    const total = row.points + row.livePoints;
    const projectedRank = total === prevTotal ? prevRank : i + 1;
    prevRank = projectedRank;
    prevTotal = total;
    out.set(row.id, { projectedRank, delta: row.rank - projectedRank });
  });
  return out;
}
