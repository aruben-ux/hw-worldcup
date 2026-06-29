"use client";

import { knockoutRounds } from "@/lib/data";
import { buildBracket, ROUND_ORDER, type BracketSlot } from "@/lib/knockout";
import { liveMinute } from "@/lib/liveMinute";
import { ptDateLong, ptDayKey, ptTime } from "@/lib/datetime";
import { ScoreBadge, TeamLabel } from "./MatchLine";
import { useResults } from "./useResults";

export default function KnockoutSchedule() {
  const { payload } = useResults();
  const slots = buildBracket(payload?.results ?? []);
  const now = payload ? Date.parse(payload.fetchedAt) : 0;
  const roundName = (k: string) =>
    knockoutRounds.find((r) => r.key === k)?.name ?? k;

  // Group slots by Pacific calendar day, in chronological order.
  const byDate = new Map<string, BracketSlot[]>();
  for (const slot of slots.values()) {
    const date = ptDayKey(slot.match.utcDate);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(slot);
  }
  const days = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-5">
      {days.map(([date, daySlots]) => (
        <section key={date} className="rounded-lg bg-white p-3 shadow">
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-hw-black">
            {ptDateLong(daySlots[0].match.utcDate)}
          </h3>
          <ul className="divide-y divide-hw-khaki/25">
            {daySlots
              .sort(
                (a, b) =>
                  a.match.utcDate.localeCompare(b.match.utcDate) ||
                  ROUND_ORDER.indexOf(a.match.round) -
                    ROUND_ORDER.indexOf(b.match.round),
              )
              .map((slot) => {
                const r = slot.result;
                return (
                  <li
                    key={slot.match.id}
                    className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 py-2 text-sm"
                  >
                    <span className="justify-self-end text-right">
                      {slot.home ? (
                        <TeamLabel code={slot.home} full />
                      ) : (
                        <span className="text-hw-gray/50">TBD</span>
                      )}
                    </span>
                    <span className="justify-self-center">
                      <ScoreBadge result={r} />
                    </span>
                    <span className="justify-self-start">
                      {slot.away ? (
                        <TeamLabel code={slot.away} full />
                      ) : (
                        <span className="text-hw-gray/50">TBD</span>
                      )}
                    </span>
                    <span className="w-20 text-right text-[11px] text-hw-gray/70">
                      {r?.status === "live" ? (
                        liveMinute(r, now)
                      ) : r?.status === "finished" ? (
                        "FT"
                      ) : (
                        <span className="flex flex-col leading-tight">
                          <span>{ptTime(slot.match.utcDate)}</span>
                          <span className="text-[9px] uppercase text-hw-gray/50">
                            {roundName(slot.match.round)}
                          </span>
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
