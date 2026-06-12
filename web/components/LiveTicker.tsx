"use client";

import { useEffect, useState } from "react";
import { matchById } from "@/lib/data";
import { flagUrl } from "@/lib/flags";
import { liveMinute } from "@/lib/liveMinute";
import { useResults } from "./useResults";

function Flag({ code }: { code: string }) {
  const url = flagUrl(code);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny external flag icons
    <img
      src={url}
      alt=""
      className="h-3 w-auto rounded-[2px] ring-1 ring-white/20"
      loading="lazy"
    />
  );
}

export default function LiveTicker() {
  const { payload } = useResults();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const live = (payload?.results ?? []).filter((r) => r.status === "live");
  if (live.length === 0) return null;

  return (
    <div className="border-b border-hw-gold/40 bg-hw-black text-white">
      <div className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto px-4 py-2">
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-hw-red">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-hw-red" />
          Live
        </span>
        {live.map((r) => {
          const m = matchById.get(r.matchId);
          if (!m) return null;
          return (
            <span
              key={r.matchId}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold"
            >
              <Flag code={m.home} />
              <span>{m.home}</span>
              <span className="rounded bg-hw-red px-1.5 py-0.5 font-black tabular-nums">
                {r.score ? `${r.score.home}–${r.score.away}` : "0–0"}
              </span>
              <span>{m.away}</span>
              <Flag code={m.away} />
              <span className="text-[10px] font-bold text-hw-gold">
                {liveMinute(r, now)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
