import matchesJson from "@/data/matches.json";
import teamsJson from "@/data/teams.json";
import picksJson from "@/data/picks.json";
import type { Match, Participant } from "./types";

export const matches: Match[] = matchesJson.matches;
export const matchById = new Map(matches.map((m) => [m.id, m]));

export const teams = teamsJson as Record<string, { name: string; group: string }>;

export const participants: Participant[] = picksJson.participants as Participant[];

export const ENTRY_FEE = 20;
export const POT = participants.length * ENTRY_FEE;

/** Matches grouped by date, in sheet order. */
export const matchesByDate: [string, Match[]][] = (() => {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    if (!map.has(m.date)) map.set(m.date, []);
    map.get(m.date)!.push(m);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
})();
