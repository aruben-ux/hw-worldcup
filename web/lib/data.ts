import matchesJson from "@/data/matches.json";
import teamsJson from "@/data/teams.json";
import picksJson from "@/data/picks.json";
import knockoutJson from "@/data/knockout.json";
import knockoutPicksJson from "@/data/knockout-picks.json";
import type {
  KnockoutMatch,
  KnockoutParticipant,
  KnockoutRound,
  Match,
  Participant,
} from "./types";

export const matches: Match[] = matchesJson.matches;
export const matchById = new Map(matches.map((m) => [m.id, m]));

export const knockoutRounds = knockoutJson.rounds as KnockoutRound[];
export const knockoutMatches = knockoutJson.matches as KnockoutMatch[];
export const knockoutById = new Map(knockoutMatches.map((m) => [m.id, m]));
export const roundPoints = new Map(
  knockoutRounds.map((r) => [r.key, r.points]),
);

/** apiMatchId -> { id, home, away } across group + knockout, for the
 * results route. home/away are our orientation (null for unseeded
 * knockout slots). */
export const matchByApiId = new Map<
  number,
  { id: string; home: string | null; away: string | null }
>([
  ...matches.map(
    (m) => [m.apiMatchId, { id: m.id, home: m.home, away: m.away }] as const,
  ),
  ...knockoutMatches.map(
    (m) => [m.apiMatchId, { id: m.id, home: m.home, away: m.away }] as const,
  ),
]);

export const teams = teamsJson as Record<
  string,
  { name: string; group: string; crest?: string }
>;

export const participants: Participant[] = picksJson.participants as Participant[];

export const ENTRY_FEE = 20;
export const POT = participants.length * ENTRY_FEE;

export const knockoutParticipants =
  knockoutPicksJson.participants as KnockoutParticipant[];
export const KNOCKOUT_POT =
  knockoutParticipants.length * (knockoutPicksJson.entryFee ?? ENTRY_FEE);

/** Matches grouped by date, in sheet order. */
export const matchesByDate: [string, Match[]][] = (() => {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    if (!map.has(m.date)) map.set(m.date, []);
    map.get(m.date)!.push(m);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
})();
