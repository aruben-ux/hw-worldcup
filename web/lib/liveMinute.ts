import type { MatchResult } from "./types";

/**
 * Best-effort match clock for a live game. The free football-data tier
 * doesn't expose the match minute, so estimate from kickoff time:
 * first-half minutes are wall-clock exact; the half-time break (~15min
 * plus first-half stoppage) makes second-half minutes approximate.
 */
export function liveMinute(result: MatchResult, now: number): string {
  if (result.minute) return `${result.minute}′`;
  if (!result.utcDate) return "LIVE";
  const wall = (now - Date.parse(result.utcDate)) / 60_000;
  if (wall < 1) return "1′";
  if (wall <= 45) return `${Math.floor(wall)}′`;
  if (wall <= 50) return "45+′";
  if (wall <= 62) return "HT";
  const minute = 46 + Math.floor(wall - 62);
  return minute >= 90 ? "90+′" : `~${minute}′`;
}
