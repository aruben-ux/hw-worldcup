export type PickValue = "home" | "away" | "draw" | "blank" | "unresolved";
export type Outcome = "home" | "away" | "draw";

export interface Match {
  id: string;
  date: string; // YYYY-MM-DD, sheet-local (US) date
  card: string;
  row: number;
  group: string;
  home: string; // sheet-left team code
  away: string; // sheet-right team code
  apiMatchId: number;
  utcDate: string;
}

export type RoundKey = "R32" | "R16" | "QF" | "SF" | "F" | "3P";

export interface KnockoutRound {
  key: RoundKey;
  name: string;
  points: number;
}

export interface KnockoutMatch {
  id: string; // e.g. "R16-2"
  round: RoundKey;
  slot: number;
  apiMatchId: number;
  utcDate: string;
  home: string | null; // seed; site recomputes live from results
  away: string | null;
  feedsInto: string | null;
  feedsSide: "home" | "away" | null;
  loserFeedsInto?: string;
  loserFeedsSide?: "home" | "away";
}

export interface Participant {
  id: string;
  page: number;
  name: string;
  picks: Record<string, PickValue>;
}

/** Knockout-pool participant: picks map bracket-slot id -> team code. */
export interface KnockoutParticipant {
  id: string;
  name: string;
  picks: Record<string, string>;
}

export type MatchStatus = "scheduled" | "live" | "finished";

export interface MatchResult {
  matchId: string;
  status: MatchStatus;
  /**
   * Outcome relative to OUR stored home/away orientation (group-stage
   * scoring). Final when finished, current-score outcome when live.
   */
  outcome: Outcome | null;
  /** Score in our home/away orientation. */
  score: { home: number; away: number } | null;
  /**
   * Actual team codes + winner from the API, orientation-independent.
   * Used by the knockout bracket (advancement) and the live ticker.
   * winnerCode is the winning team's code, "DRAW", or null if undecided.
   * Accounts for extra time / penalties via the API's score.winner.
   */
  homeCode?: string | null;
  awayCode?: string | null;
  winnerCode?: string | null;
  utcDate?: string;
  minute?: string | null;
}

export interface ResultsPayload {
  results: MatchResult[];
  fetchedAt: string;
  source: "live" | "mock" | "none";
  unmatched?: string[];
}

export interface StandingRow {
  id: string;
  name: string;
  rank: number;
  points: number;
  livePoints: number;
  maxPossible: number;
  correct: number;
  wrong: number;
  pending: number;
}
