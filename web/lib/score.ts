import type {
  MatchResult,
  Participant,
  StandingRow,
} from "./types";

const SCOREABLE = new Set(["home", "away", "draw"]);

/**
 * Compute the leaderboard. 1 point per correct win/draw/win pick on a
 * finished match. Live matches contribute provisional points (shown
 * separately, never added to `points`). Blank/unresolved picks can never
 * score, so they don't count toward maxPossible either.
 */
export function computeStandings(
  participants: Participant[],
  results: MatchResult[],
): StandingRow[] {
  const byMatch = new Map(results.map((r) => [r.matchId, r]));
  const rows = participants.map((p) => {
    let points = 0;
    let livePoints = 0;
    let wrong = 0;
    let pending = 0;
    for (const [matchId, pick] of Object.entries(p.picks)) {
      const scoreable = SCOREABLE.has(pick);
      const r = byMatch.get(matchId);
      if (!r || r.status === "scheduled") {
        if (scoreable) pending += 1;
        continue;
      }
      if (r.status === "finished") {
        if (scoreable && pick === r.outcome) points += 1;
        else wrong += 1;
        continue;
      }
      // live: provisional, and still winnable either way
      if (scoreable) {
        pending += 1;
        if (pick === r.outcome) livePoints += 1;
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
      a.name.localeCompare(b.name),
  );
  // Standard competition ranking on finished points only (1224).
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

/** Pick distribution for one match across all participants. */
export function pickDistribution(
  participants: Participant[],
  matchId: string,
): { home: number; draw: number; away: number; none: number } {
  const dist = { home: 0, draw: 0, away: 0, none: 0 };
  for (const p of participants) {
    const pick = p.picks[matchId];
    if (pick === "home" || pick === "draw" || pick === "away") dist[pick] += 1;
    else dist.none += 1;
  }
  return dist;
}
