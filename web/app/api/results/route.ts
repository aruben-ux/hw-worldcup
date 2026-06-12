import { NextResponse } from "next/server";
import { matches } from "@/lib/data";
import type { MatchResult, Outcome, ResultsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const API_URL =
  "https://api.football-data.org/v4/competitions/WC/matches?season=2026";

/** football-data TLA / name -> our sheet code, where they differ. */
const ALIASES: Record<string, string> = {
  // by TLA
  SAU: "KSA",
  URY: "URU",
  // by name
  "Korea Republic": "KOR",
  "South Korea": "KOR",
  "Czech Republic": "CZE",
  Czechia: "CZE",
  Türkiye: "TUR",
  Turkey: "TUR",
  "Côte d'Ivoire": "CIV",
  "Ivory Coast": "CIV",
  "Saudi Arabia": "KSA",
  "Cape Verde Islands": "CPV",
  "Cabo Verde": "CPV",
  "DR Congo": "COD",
  "Congo DR": "COD",
  "Bosnia and Herzegovina": "BIH",
  "Bosnia-Herzegovina": "BIH",
};

const OUR_CODES = new Set(matches.flatMap((m) => [m.home, m.away]));

function toOurCode(team: { tla?: string; name?: string }): string | null {
  if (team.tla && OUR_CODES.has(team.tla)) return team.tla;
  if (team.tla && ALIASES[team.tla]) return ALIASES[team.tla];
  if (team.name && ALIASES[team.name]) return ALIASES[team.name];
  return null;
}

const pairKey = (a: string, b: string) => [a, b].sort().join("-");
const matchByPair = new Map(matches.map((m) => [pairKey(m.home, m.away), m]));

function outcomeFrom(home: number, away: number): Outcome {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  minute?: string | null;
  homeTeam: { tla?: string; name?: string };
  awayTeam: { tla?: string; name?: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
}

function normalize(apiMatches: ApiMatch[]): {
  results: MatchResult[];
  unmatched: string[];
} {
  const results = new Map<string, MatchResult>();
  const unmatched: string[] = [];
  for (const am of apiMatches) {
    const h = toOurCode(am.homeTeam);
    const a = toOurCode(am.awayTeam);
    const sheet = h && a ? matchByPair.get(pairKey(h, a)) : undefined;
    if (!sheet) {
      // Knockout matches and TBD placeholders land here; only report
      // group-stage-looking pairs as a problem.
      if (h && a) unmatched.push(`${am.homeTeam.name} vs ${am.awayTeam.name}`);
      continue;
    }
    const flipped = sheet.home !== h;
    const status: MatchResult["status"] =
      am.status === "FINISHED" || am.status === "AWARDED"
        ? "finished"
        : am.status === "IN_PLAY" || am.status === "PAUSED"
          ? "live"
          : "scheduled";
    const ft = am.score?.fullTime;
    const hasScore =
      status !== "scheduled" && ft != null && ft.home != null && ft.away != null;
    const scoreHome = hasScore ? (flipped ? ft.away! : ft.home!) : null;
    const scoreAway = hasScore ? (flipped ? ft.home! : ft.away!) : null;
    results.set(sheet.id, {
      matchId: sheet.id,
      status,
      outcome: hasScore ? outcomeFrom(scoreHome!, scoreAway!) : null,
      score: hasScore ? { home: scoreHome!, away: scoreAway! } : null,
      utcDate: am.utcDate,
      minute: am.minute ?? null,
    });
  }
  // Every sheet match gets an entry so the client never sees gaps.
  for (const m of matches) {
    if (!results.has(m.id)) {
      results.set(m.id, {
        matchId: m.id,
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
