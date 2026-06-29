"use client";

import Link from "next/link";
import { knockoutParticipants } from "@/lib/data";
import {
  computeKnockoutStandings,
  liveProjection,
  titleRace,
} from "@/lib/knockout";
import TitleRace from "./TitleRace";
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
          Scoring: R32 = 1 · R16 = 2 · QF = 3 · finalist = 5 · champion = 7,
          plus third place (4 per team, 6 for the winner).
        </p>
      </div>
    );
  }

  const standings = computeKnockoutStandings(knockoutParticipants, results);
  const anyLive = results.some((r) => r.status === "live");
  const contenders = titleRace(knockoutParticipants, results);
  const moves = anyLive ? liveProjection(standings) : null;
  const topMover = moves
    ? standings
        .map((r) => ({ row: r, mv: moves.get(r.id)! }))
        .filter((x) => x.mv.delta > 0)
        .sort((a, b) => b.mv.delta - a.mv.delta || b.row.livePoints - a.row.livePoints)[0]
    : undefined;

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-md bg-hw-red/10 px-3 py-2 text-sm font-semibold text-hw-red">
          Couldn&apos;t refresh results: {error}
        </p>
      )}
      <TitleRace contenders={contenders} />
      {topMover && (
        <p className="mb-3 rounded-md bg-hw-green/15 px-3 py-2 text-sm text-green-900">
          <span className="font-black">▲ Biggest live mover:</span>{" "}
          {topMover.row.name} (+{topMover.row.livePoints}, up {topMover.mv.delta}{" "}
          {topMover.mv.delta === 1 ? "spot" : "spots"})
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
            {standings.map((row, i) => {
              const mv = moves?.get(row.id);
              return (
              <tr
                key={row.id}
                className={`border-t border-hw-khaki/30 ${
                  row.rank === 1
                    ? "bg-hw-gold/15"
                    : mv && row.livePoints > 0
                      ? "bg-hw-green/10"
                      : i % 2
                        ? "bg-hw-cream/50"
                        : ""
                }`}
              >
                <td className="px-3 py-2 text-center font-bold text-hw-gray/70">
                  <span className="inline-flex items-center gap-1">
                    {row.rank}
                    {mv && mv.delta > 0 && (
                      <span className="text-[10px] font-black text-hw-green">
                        ▲{mv.delta}
                      </span>
                    )}
                    {mv && mv.delta < 0 && (
                      <span className="text-[10px] font-black text-hw-red">
                        ▼{-mv.delta}
                      </span>
                    )}
                  </span>
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
              );
            })}
          </tbody>
        </table>
      </div>
      {anyLive && (
        <p className="mt-3 text-xs font-semibold text-hw-gray">
          ▲▼ shows where each entrant would move if the current live scores
          held. Standings stay sorted by banked points until matches finish.
        </p>
      )}
      <p className="mt-3 text-xs text-hw-gray/80">
        Sheet scoring: R32 = 1, R16 = 2, QF = 3, finalist = 5, champion = 7;
        third place = 4 per correct team and 6 for the winner. A pick scores only
        if that team wins that bracket match. Max is an optimistic ceiling
        assuming every still-alive pick comes through.
      </p>
    </div>
  );
}
