"use client";

import Link from "next/link";
import { knockoutParticipants, knockoutRounds, teams } from "@/lib/data";
import {
  buildBracket,
  computeKnockoutStandings,
  ROUND_ORDER,
} from "@/lib/knockout";
import type { RoundKey } from "@/lib/types";
import { useResults } from "./useResults";

const name = (code: string | null) =>
  code ? (teams[code]?.name ?? code) : "TBD";

export default function PlayerBracket({ playerId }: { playerId: string }) {
  const { payload } = useResults();
  const results = payload?.results ?? [];
  const player = knockoutParticipants.find((p) => p.id === playerId);
  if (!player) {
    return (
      <p className="text-hw-gray">
        Unknown entry.{" "}
        <Link href="/leaderboard" className="text-hw-red underline">
          Back to leaderboard
        </Link>
      </p>
    );
  }
  const slots = buildBracket(results);
  const standing = computeKnockoutStandings(knockoutParticipants, results).find(
    (s) => s.id === playerId,
  )!;
  const scoredRounds = ROUND_ORDER.filter(
    (rk) => (knockoutRounds.find((r) => r.key === rk)?.points ?? 0) > 0,
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-black text-hw-black">{player.name}</h2>
        <div className="text-sm text-hw-gray">
          rank <b className="text-hw-black">#{standing.rank}</b> ·{" "}
          <b className="text-hw-black">{standing.points}</b> pts
          {standing.livePoints > 0 && (
            <span className="font-bold text-hw-red"> +{standing.livePoints} live</span>
          )}{" "}
          · max {standing.maxPossible}
        </div>
      </div>
      <div className="space-y-4">
        {scoredRounds.map((rk: RoundKey) => {
          const round = knockoutRounds.find((r) => r.key === rk)!;
          const roundSlots = [...slots.values()]
            .filter((s) => s.match.round === rk)
            .sort((a, b) => a.match.slot - b.match.slot);
          return (
            <section key={rk} className="rounded-lg bg-white p-3 shadow">
              <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-hw-gray/70">
                {round.name} · {round.points} pts each
              </h3>
              <ul className="divide-y divide-hw-khaki/25">
                {roundSlots.map((slot) => {
                  const pick = player.picks[slot.match.id];
                  const decided = slot.winner != null;
                  const correct = decided && pick === slot.winner;
                  const eliminated =
                    pick &&
                    !decided &&
                    // pick lost earlier if it's not one of this slot's teams
                    // once both teams are known
                    slot.home != null &&
                    slot.away != null &&
                    pick !== slot.home &&
                    pick !== slot.away;
                  const cls = !pick
                    ? "bg-hw-cream/60 text-hw-gray/60"
                    : correct
                      ? "bg-hw-green/25 text-green-900"
                      : decided
                        ? "bg-hw-red/10 text-hw-red line-through"
                        : eliminated
                          ? "bg-hw-red/10 text-hw-red"
                          : "bg-hw-cream text-hw-gray";
                  return (
                    <li
                      key={slot.match.id}
                      className="flex items-center justify-between gap-2 py-1.5 text-sm"
                    >
                      <span className="text-hw-gray">
                        {name(slot.home)}{" "}
                        <span className="text-hw-gray/50">v</span> {name(slot.away)}
                      </span>
                      <span
                        className={`min-w-24 rounded px-2 py-0.5 text-center text-xs font-semibold ${cls}`}
                      >
                        {pick ? name(pick) : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
