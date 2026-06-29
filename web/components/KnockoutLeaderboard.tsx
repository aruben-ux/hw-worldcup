"use client";

import Link from "next/link";
import { knockoutParticipants } from "@/lib/data";
import { computeKnockoutStandings } from "@/lib/knockout";
import { useResults } from "./useResults";

export default function KnockoutLeaderboard() {
  const { payload, error } = useResults();
  const results = payload?.results ?? [];

  if (knockoutParticipants.length === 0) {
    return (
      <div className="rounded-lg border border-hw-khaki/50 bg-white p-6 text-center shadow">
        <h1 className="mb-2 text-lg font-black uppercase tracking-tight text-hw-black">
          Bracket picks coming soon
        </h1>
        <p className="mx-auto max-w-md text-sm text-hw-gray">
          Knockout-round picks are being collected. Once everyone&apos;s bracket
          is in, this leaderboard goes live and updates with every result.
          Meanwhile, follow the action on the{" "}
          <Link href="/" className="font-semibold text-hw-red hover:underline">
            bracket
          </Link>
          .
        </p>
        <p className="mt-3 text-xs text-hw-gray/70">
          Scoring: R32 = 1 · R16 = 2 · QF = 4 · SF = 8 · Final = 16 points per
          correct pick.
        </p>
      </div>
    );
  }

  const standings = computeKnockoutStandings(knockoutParticipants, results);
  const anyLive = results.some((r) => r.status === "live");

  return (
    <div>
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
              <th className="hidden px-2 py-2.5 text-right sm:table-cell">Max</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr
                key={row.id}
                className={`border-t border-hw-khaki/30 ${
                  row.rank === 1 ? "bg-hw-gold/15" : i % 2 ? "bg-hw-cream/50" : ""
                }`}
              >
                <td className="px-3 py-2 text-center font-bold text-hw-gray/70">
                  {row.rank}
                </td>
                <td className="px-2 py-2">
                  <Link
                    href={`/bracket/${row.id}`}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-hw-gray/80">
        Round-weighted scoring (R32 = 1 … Final = 16). A pick scores only if that
        team wins that bracket match. Max is an optimistic ceiling assuming every
        still-alive pick comes through.
      </p>
    </div>
  );
}
