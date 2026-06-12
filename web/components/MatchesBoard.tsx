"use client";

import { matchesByDate, participants } from "@/lib/data";
import { pickDistribution } from "@/lib/score";
import { ScoreBadge, TeamLabel, statusNote } from "./MatchLine";
import { useResults } from "./useResults";

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export default function MatchesBoard() {
  const { payload } = useResults();
  const byMatch = new Map(
    (payload?.results ?? []).map((r) => [r.matchId, r]),
  );
  const total = participants.length;

  return (
    <div className="space-y-5">
      {matchesByDate.map(([date, dayMatches]) => (
        <section key={date} className="rounded-xl bg-white p-3 shadow">
          <h3 className="mb-2 text-sm font-bold text-slate-700">
            {DATE_FMT.format(new Date(`${date}T12:00:00Z`))}
          </h3>
          <ul className="divide-y divide-slate-100">
            {dayMatches.map((m) => {
              const r = byMatch.get(m.id);
              const dist = pickDistribution(participants, m.id);
              const outcome = r?.outcome ?? null;
              const seg = (n: number) => `${(n / total) * 100}%`;
              return (
                <li key={m.id} className="py-2.5">
                  <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 text-sm">
                    <span className="justify-self-end text-right">
                      <TeamLabel code={m.home} full />
                    </span>
                    <span className="justify-self-center">
                      <ScoreBadge result={r} />
                    </span>
                    <span className="justify-self-start">
                      <TeamLabel code={m.away} full />
                    </span>
                    <span className="w-12 text-right text-xs text-slate-400">
                      {statusNote(r, m)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="w-10 shrink-0 text-right tabular-nums">
                      {dist.home} {m.home}
                    </span>
                    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={
                          outcome === "home" ? "bg-green-500" : "bg-blue-400"
                        }
                        style={{ width: seg(dist.home) }}
                      />
                      <div
                        className={
                          outcome === "draw" ? "bg-green-500" : "bg-slate-300"
                        }
                        style={{ width: seg(dist.draw) }}
                      />
                      <div
                        className={
                          outcome === "away" ? "bg-green-500" : "bg-orange-400"
                        }
                        style={{ width: seg(dist.away) }}
                      />
                    </div>
                    <span className="w-10 shrink-0 tabular-nums">
                      {dist.away} {m.away}
                    </span>
                  </div>
                  {dist.draw > 0 && (
                    <div className="mt-0.5 text-center text-[11px] text-slate-400">
                      {dist.draw} picked draw
                      {dist.none > 0 && ` · ${dist.none} no pick`}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
