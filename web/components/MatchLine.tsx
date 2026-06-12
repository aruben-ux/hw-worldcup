"use client";

import { flagUrl } from "@/lib/flags";
import { teams } from "@/lib/data";
import { liveMinute } from "@/lib/liveMinute";
import type { Match, MatchResult } from "@/lib/types";

export function TeamLabel({ code, full }: { code: string; full?: boolean }) {
  const url = flagUrl(code);
  return (
    <span className="inline-flex items-center gap-1.5">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- tiny external flag icons, next/image overhead not worth it
        <img
          src={url}
          alt=""
          className="h-3.5 w-auto rounded-[2px] shadow-sm ring-1 ring-black/10"
          loading="lazy"
        />
      )}
      <span>{full ? (teams[code]?.name ?? code) : code}</span>
    </span>
  );
}

export function ScoreBadge({ result }: { result: MatchResult | undefined }) {
  if (!result || result.status === "scheduled" || !result.score) {
    return <span className="text-xs text-hw-gray/60">vs</span>;
  }
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-sm font-bold tabular-nums ${
        result.status === "live"
          ? "bg-hw-red text-white"
          : "bg-hw-black text-white"
      }`}
    >
      {result.score.home}&ndash;{result.score.away}
    </span>
  );
}

export function statusNote(result: MatchResult | undefined, match: Match) {
  if (!result || result.status === "scheduled") return match.date.slice(5);
  if (result.status === "live") return liveMinute(result, Date.now());
  return "FT";
}
