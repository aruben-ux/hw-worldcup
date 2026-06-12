"use client";

import Link from "next/link";
import { matchesByDate, participants } from "@/lib/data";
import { computeStandings } from "@/lib/score";
import type { MatchResult, PickValue } from "@/lib/types";
import { ScoreBadge, TeamLabel, statusNote } from "./MatchLine";
import { useResults } from "./useResults";

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function pickLabel(pick: PickValue, home: string, away: string): string {
  switch (pick) {
    case "home":
      return home;
    case "away":
      return away;
    case "draw":
      return "Draw";
    default:
      return "—";
  }
}

function verdict(
  pick: PickValue,
  result: MatchResult | undefined,
): "correct" | "wrong" | "live-correct" | "live-wrong" | "pending" | "void" {
  if (pick === "blank" || pick === "unresolved") return "void";
  if (!result || result.status === "scheduled" || !result.outcome)
    return "pending";
  const hit = pick === result.outcome;
  if (result.status === "live") return hit ? "live-correct" : "live-wrong";
  return hit ? "correct" : "wrong";
}

const VERDICT_STYLE: Record<string, string> = {
  correct: "bg-hw-green/25 text-green-900",
  wrong: "bg-hw-red/10 text-hw-red line-through",
  "live-correct": "bg-hw-green/15 text-green-800 ring-1 ring-hw-green",
  "live-wrong": "bg-hw-gold/15 text-hw-orange",
  pending: "bg-hw-cream text-hw-gray",
  void: "bg-hw-cream/60 text-hw-gray/60",
};

export default function PlayerDetail({ playerId }: { playerId: string }) {
  const { payload } = useResults();
  const results = payload?.results ?? [];
  const byMatch = new Map(results.map((r) => [r.matchId, r]));
  const player = participants.find((p) => p.id === playerId);
  if (!player) {
    return (
      <p className="text-hw-gray">
        Unknown player.{" "}
        <Link href="/" className="text-hw-red underline">
          Back to leaderboard
        </Link>
      </p>
    );
  }
  const standing = computeStandings(participants, results).find(
    (s) => s.id === playerId,
  )!;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-black text-hw-black">{player.name}</h2>
        <div className="text-sm text-hw-gray">
          rank <b className="text-hw-black">#{standing.rank}</b> &middot;{" "}
          <b className="text-hw-black">{standing.points}</b> pts
          {standing.livePoints > 0 && (
            <span className="font-bold text-hw-red">
              {" "}
              +{standing.livePoints} live
            </span>
          )}{" "}
          &middot; max {standing.maxPossible}
        </div>
      </div>
      <div className="space-y-4">
        {matchesByDate.map(([date, dayMatches]) => (
          <section key={date} className="rounded-lg bg-white p-3 shadow">
            <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-hw-gray/70">
              {DATE_FMT.format(new Date(`${date}T12:00:00Z`))}
            </h3>
            <ul className="divide-y divide-hw-khaki/25">
              {dayMatches.map((m) => {
                const r = byMatch.get(m.id);
                const pick = player.picks[m.id];
                const v = verdict(pick, r);
                return (
                  <li
                    key={m.id}
                    className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 py-1.5 text-sm"
                  >
                    <span className="justify-self-end text-right">
                      <TeamLabel code={m.home} />
                    </span>
                    <span className="justify-self-center">
                      <ScoreBadge result={r} />
                    </span>
                    <span className="justify-self-start">
                      <TeamLabel code={m.away} />
                    </span>
                    <span
                      className={`min-w-20 rounded px-2 py-0.5 text-center text-xs font-semibold ${VERDICT_STYLE[v]}`}
                      title={statusNote(r, m)}
                    >
                      {pickLabel(pick, m.home, m.away)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
