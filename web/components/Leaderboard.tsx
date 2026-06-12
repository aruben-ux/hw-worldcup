"use client";

import Link from "next/link";
import { participants } from "@/lib/data";
import { computeStandings } from "@/lib/score";
import { useResults } from "./useResults";

export default function Leaderboard() {
  const { payload, error } = useResults();
  const results = payload?.results ?? [];
  const standings = computeStandings(participants, results);
  const anyLive = results.some((r) => r.status === "live");
  const played = results.filter((r) => r.status === "finished").length;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between text-sm text-hw-gray">
        <span>
          {played}/72 matches final
          {anyLive && (
            <span className="ml-2 inline-flex items-center gap-1 font-bold text-hw-red">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-hw-red" />
              LIVE
            </span>
          )}
        </span>
        {payload && (
          <span suppressHydrationWarning>
            updated {new Date(payload.fetchedAt).toLocaleTimeString()}
            {payload.source !== "live" && ` (${payload.source})`}
          </span>
        )}
      </div>
      {error && (
        <p className="mb-3 rounded-md bg-hw-red/10 px-3 py-2 text-sm font-semibold text-hw-red">
          Couldn&apos;t refresh results: {error}
        </p>
      )}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-hw-black text-left text-xs font-black uppercase tracking-wide text-white">
              <th className="px-3 py-2.5 text-center">#</th>
              <th className="px-2 py-2.5">Name</th>
              <th className="px-2 py-2.5 text-right">Pts</th>
              {anyLive && <th className="px-2 py-2.5 text-right">Live</th>}
              <th className="hidden px-2 py-2.5 text-right sm:table-cell">
                Max
              </th>
              <th className="hidden px-3 py-2.5 text-right sm:table-cell">
                W&ndash;L
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr
                key={row.id}
                className={`border-t border-hw-khaki/30 ${
                  row.rank === 1 && played > 0
                    ? "bg-hw-gold/15"
                    : i % 2
                      ? "bg-hw-cream/50"
                      : ""
                }`}
              >
                <td className="px-3 py-2 text-center font-bold text-hw-gray/70">
                  {row.rank}
                </td>
                <td className="px-2 py-2">
                  <Link
                    href={`/player/${row.id}`}
                    className="font-semibold text-hw-black hover:text-hw-red hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-2 py-2 text-right text-base font-black tabular-nums">
                  {row.points}
                </td>
                {anyLive && (
                  <td className="px-2 py-2 text-right font-bold tabular-nums text-hw-red">
                    {row.livePoints > 0 ? `+${row.livePoints}` : ""}
                  </td>
                )}
                <td className="hidden px-2 py-2 text-right tabular-nums text-hw-gray/70 sm:table-cell">
                  {row.maxPossible}
                </td>
                <td className="hidden px-3 py-2 text-right tabular-nums text-hw-gray/70 sm:table-cell">
                  {row.correct}&ndash;{row.wrong}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-hw-gray/80">
        1 point per correct result (win/draw/win). Max = points still
        reachable. Live points are provisional and not added until full time.
      </p>
    </div>
  );
}
