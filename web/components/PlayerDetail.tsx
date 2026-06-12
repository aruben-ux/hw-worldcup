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
  correct: "bg-green-100 text-green-800",
  wrong: "bg-red-100 text-red-700 line-through",
  "live-correct": "bg-green-50 text-green-700 ring-1 ring-green-300",
  "live-wrong": "bg-amber-50 text-amber-700",
  pending: "bg-slate-100 text-slate-600",
  void: "bg-slate-50 text-slate-400",
};

export default function PlayerDetail({ playerId }: { playerId: string }) {
  const { payload } = useResults();
  const results = payload?.results ?? [];
  const byMatch = new Map(results.map((r) => [r.matchId, r]));
  const player = participants.find((p) => p.id === playerId);
  if (!player) {
    return (
      <p className="text-slate-600">
        Unknown player. <Link href="/" className="underline">Back to leaderboard</Link>
      </p>
    );
  }
  const standing = computeStandings(participants, results).find(
    (s) => s.id === playerId,
  )!;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-800">{player.name}</h2>
        <div className="text-sm text-slate-500">
          rank <b className="text-slate-800">#{standing.rank}</b> &middot;{" "}
          <b className="text-slate-800">{standing.points}</b> pts
          {standing.livePoints > 0 && (
            <span className="text-red-600"> +{standing.livePoints} live</span>
          )}{" "}
          &middot; max {standing.maxPossible}
        </div>
      </div>
      <div className="space-y-4">
        {matchesByDate.map(([date, dayMatches]) => (
          <section key={date} className="rounded-xl bg-white p-3 shadow">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              {DATE_FMT.format(new Date(`${date}T12:00:00Z`))}
            </h3>
            <ul className="divide-y divide-slate-100">
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
