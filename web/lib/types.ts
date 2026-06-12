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
}

export interface Participant {
  id: string;
  page: number;
  name: string;
  picks: Record<string, PickValue>;
}

export type MatchStatus = "scheduled" | "live" | "finished";

export interface MatchResult {
  matchId: string;
  status: MatchStatus;
  /** Final outcome when finished, current-score outcome when live. */
  outcome: Outcome | null;
  score: { home: number; away: number } | null;
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
