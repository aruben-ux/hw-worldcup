import { NextResponse } from "next/server";
import { matchByApiId } from "@/lib/data";
import type { MatchResult, Outcome, ResultsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const API_URL =
  "https://api.football-data.org/v4/competitions/WC/matches?season=2026";

/** football-data TLA -> our code, where they differ. */
const ALIASES: Record<string, string> = {
  SAU: "KSA",
  URY: "URU",
};

function toOurCode(team: { tla?: string | null }): string | null {
  if (!team.tla) return null;
  return ALIASES[team.tla] ?? team.tla;
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  minute?: string | null;
  homeTeam: { tla?: string | null };
  awayTeam: { tla?: string | null };
  score?: {
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime?: { home: number | null; away: number | null };
  };
}

function toStatus(s: string): MatchResult["status"] {
  if (s === "FINISHED" || s === "AWARDED") return "finished";
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  return "scheduled";
}

function normalize(apiMatches: ApiMatch[]): {
  results: MatchResult[];
  unmatched: string[];
} {
  const results = new Map<string, MatchResult>();
  const unmatched: string[] = [];

  for (const am of apiMatches) {
    const ours = matchByApiId.get(am.id);
    if (!ours) {
      unmatched.push(`api#${am.id}`);
      continue;
    }
    const hCode = toOurCode(am.homeTeam);
    const aCode = toOurCode(am.awayTeam);
    const ft = am.score?.fullTime;
    const hasScoreVals = ft != null && ft.home != null && ft.away != null;

    // The football-data free tier often keeps status "TIMED" while it
    // updates the running score, so a live match never flips to IN_PLAY.
    // Treat any not-finished match that already has a score and whose
    // kickoff has passed as live, so scores show during the game.
    const raw = toStatus(am.status);
    const kickedOff = Date.now() >= Date.parse(am.utcDate);
    const status: MatchResult["status"] =
      raw === "finished"
        ? "finished"
        : raw === "live" || (hasScoreVals && kickedOff)
          ? "live"
          : "scheduled";
    const hasScore = status !== "scheduled" && hasScoreVals;

    // Winner by team code. Prefer the API's score.winner (accounts for
    // extra time / penalties); fall back to the running score when live.
    let winnerCode: string | null | undefined;
    if (status === "finished") {
      winnerCode =
        am.score?.winner === "HOME_TEAM"
          ? hCode
          : am.score?.winner === "AWAY_TEAM"
            ? aCode
            : "DRAW";
    } else if (hasScore) {
      winnerCode =
        ft!.home! > ft!.away!
          ? hCode
          : ft!.away! > ft!.home!
            ? aCode
            : "DRAW";
    } else {
      winnerCode = undefined;
    }

    // Re-express score and outcome in OUR stored home/away orientation
    // (group-stage scoring). When our orientation is unknown (unseeded
    // knockout slot), fall back to the API orientation.
    const flipped = ours.home != null && aCode === ours.home;
    const scoreHome = hasScore ? (flipped ? ft!.away! : ft!.home!) : null;
    const scoreAway = hasScore ? (flipped ? ft!.home! : ft!.away!) : null;
    let outcome: Outcome | null = null;
    if (winnerCode !== undefined) {
      outcome =
        winnerCode === "DRAW"
          ? "draw"
          : winnerCode === ours.home
            ? "home"
            : winnerCode === ours.away
              ? "away"
              : scoreHome != null && scoreAway != null
                ? scoreHome > scoreAway
                  ? "home"
                  : scoreAway > scoreHome
                    ? "away"
                    : "draw"
                : null;
    }

    results.set(ours.id, {
      matchId: ours.id,
      status,
      outcome,
      score:
        scoreHome != null && scoreAway != null
          ? { home: scoreHome, away: scoreAway }
          : null,
      homeCode: hCode,
      awayCode: aCode,
      winnerCode,
      utcDate: am.utcDate,
      minute: am.minute ?? null,
    });
  }

  // Every known match gets an entry so the client never sees gaps.
  for (const [, ours] of matchByApiId) {
    if (!results.has(ours.id)) {
      results.set(ours.id, {
        matchId: ours.id,
        status: "scheduled",
        outcome: null,
        score: null,
      });
    }
  }
  return { results: [...results.values()], unmatched };
}

export async function GET() {
  // Local/mock mode for development and pre-launch testing.
  if (process.env.MOCK_RESULTS) {
    const { default: mock } = await import("@/mock/results.json");
    const { results, unmatched } = normalize(mock.matches as ApiMatch[]);
    return NextResponse.json<ResultsPayload>({
      results,
      unmatched,
      fetchedAt: new Date().toISOString(),
      source: "mock",
    });
  }

  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    const { results } = normalize([]);
    return NextResponse.json<ResultsPayload>({
      results,
      fetchedAt: new Date().toISOString(),
      source: "none",
    });
  }

  const res = await fetch(API_URL, {
    headers: { "X-Auth-Token": key },
    // One upstream call per minute serves every visitor (free tier: 10/min).
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `football-data.org returned ${res.status}` },
      { status: 502 },
    );
  }
  const data = (await res.json()) as { matches: ApiMatch[] };
  const { results, unmatched } = normalize(data.matches);
  return NextResponse.json<ResultsPayload>({
    results,
    unmatched,
    fetchedAt: new Date().toISOString(),
    source: "live",
  });
}
