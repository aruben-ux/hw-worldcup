"use client";

import { useState } from "react";
import Link from "next/link";
import { knockoutParticipants, knockoutRounds, teams } from "@/lib/data";
import { flagUrl } from "@/lib/flags";
import {
  buildBracket,
  computeKnockoutStandings,
  currentKnockoutRound,
  slotPickers,
  type BracketSlot,
} from "@/lib/knockout";
import { liveMinute } from "@/lib/liveMinute";
import type { RoundKey } from "@/lib/types";
import { useResults } from "./useResults";

const byKickoff = (a: BracketSlot, b: BracketSlot) =>
  a.match.utcDate.localeCompare(b.match.utcDate) || a.match.slot - b.match.slot;

const COLUMNS: RoundKey[] = ["R32", "R16", "QF", "SF", "F"];

type View = RoundKey | "ALL";
const TABS: { key: View; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "R32", label: "R32" },
  { key: "R16", label: "R16" },
  { key: "QF", label: "QF" },
  { key: "SF", label: "Semis" },
  { key: "F", label: "Final" },
];

interface Tip {
  label: string;
  names: string[];
  x: number;
  y: number;
}

function TeamRow({
  code,
  score,
  isWinner,
  dimmed,
  pickers,
  onTip,
}: {
  code: string | null;
  score: number | null;
  isWinner: boolean;
  dimmed: boolean;
  pickers: string[];
  onTip: (tip: Tip | null) => void;
}) {
  const url = code ? flagUrl(code) : null;
  const crest = code ? teams[code]?.crest : null;
  const name = code ? (teams[code]?.name ?? code) : null;

  const show = (e: { currentTarget: HTMLElement }) => {
    if (!code || pickers.length === 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const TIP_W = 192;
    const right = r.right + 8;
    const x = right + TIP_W > window.innerWidth ? r.left - TIP_W - 8 : right;
    onTip({
      label: `${name} — ${pickers.length} pick${pickers.length === 1 ? "" : "s"}`,
      names: pickers,
      x,
      y: r.top + r.height / 2,
    });
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-1.5 py-1 ${
        isWinner ? "font-black" : dimmed ? "text-hw-gray/50" : "font-medium"
      }`}
    >
      {crest ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny crest icon
        <img src={crest} alt="" className="h-4 w-4 object-contain" loading="lazy" />
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny flag icon
        <img src={url} alt="" className="h-3 w-auto rounded-[1px]" loading="lazy" />
      ) : (
        <span className="h-4 w-4" />
      )}
      <span className="flex-1 truncate">{code ?? "—"}</span>
      {code && pickers.length > 0 && (
        <button
          type="button"
          className="rounded bg-hw-gold/25 px-1 text-[10px] font-bold tabular-nums text-hw-black hover:bg-hw-gold/50"
          aria-label={`${pickers.length} picked ${name}`}
          onMouseEnter={show}
          onFocusCapture={show}
          onClick={show}
          onMouseLeave={() => onTip(null)}
          onBlur={() => onTip(null)}
        >
          {pickers.length}
        </button>
      )}
      {score != null && <span className="tabular-nums">{score}</span>}
    </div>
  );
}

function MatchCard({
  slot,
  now,
  onTip,
}: {
  slot: BracketSlot;
  now: number;
  onTip: (tip: Tip | null) => void;
}) {
  const { result } = slot;
  const live = result?.status === "live";
  const finished = result?.status === "finished";
  const homeScore = result?.score?.home ?? null;
  const awayScore = result?.score?.away ?? null;
  const homeWin = finished && slot.winner != null && slot.winner === slot.home;
  const awayWin = finished && slot.winner != null && slot.winner === slot.away;
  const pickers = slotPickers(knockoutParticipants, slot.match.id);

  return (
    <div
      className={`w-full overflow-hidden rounded-md border bg-white text-xs shadow-sm ${
        live ? "border-hw-red" : "border-hw-khaki/40"
      }`}
    >
      <TeamRow
        code={slot.home}
        score={homeScore}
        isWinner={homeWin}
        dimmed={finished && !homeWin}
        pickers={slot.home ? (pickers[slot.home] ?? []) : []}
        onTip={onTip}
      />
      <div className="h-px bg-hw-khaki/40" />
      <TeamRow
        code={slot.away}
        score={awayScore}
        isWinner={awayWin}
        dimmed={finished && !awayWin}
        pickers={slot.away ? (pickers[slot.away] ?? []) : []}
        onTip={onTip}
      />
      <div
        className={`px-2 py-0.5 text-center text-[10px] font-semibold ${
          live ? "bg-hw-red text-white" : "bg-hw-cream text-hw-gray"
        }`}
      >
        {live
          ? liveMinute(result, now)
          : finished
            ? "FT"
            : new Date(slot.match.utcDate).toLocaleDateString(undefined, {
                month: "numeric",
                day: "numeric",
              })}
      </div>
    </div>
  );
}

export default function Bracket() {
  const { payload } = useResults();
  const [tip, setTip] = useState<Tip | null>(null);
  const [view, setView] = useState<View | null>(null);
  const results = payload?.results ?? [];
  const slots = buildBracket(results);
  const standings = computeKnockoutStandings(knockoutParticipants, results);
  const top5 = standings.slice(0, 5);
  const anyLive = results.some((r) => r.status === "live");
  const matchesByRound = (rk: RoundKey) =>
    [...slots.values()]
      .filter((s) => s.match.round === rk)
      .sort((a, b) => a.match.slot - b.match.slot);
  const now = payload ? Date.parse(payload.fetchedAt) : 0;
  const roundName = (rk: RoundKey) =>
    knockoutRounds.find((r) => r.key === rk)?.name ?? rk;
  const pointsFor = (rk: RoundKey) =>
    knockoutRounds.find((r) => r.key === rk)?.points ?? 0;

  // Default to the current round until the user taps a tab.
  const active: View = view ?? currentKnockoutRound(results);

  return (
    <div>
      {top5.length > 0 && (
        <section className="mb-4 overflow-hidden rounded-lg bg-white shadow">
          <div className="flex items-center justify-between bg-hw-black px-3 py-2">
            <h2 className="text-xs font-black uppercase tracking-wide text-white">
              Leaderboard — Top 5
            </h2>
            <Link
              href="/leaderboard"
              className="text-xs font-semibold text-hw-gold hover:underline"
            >
              Full standings →
            </Link>
          </div>
          <ol>
            {top5.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-2 border-t border-hw-khaki/30 px-3 py-1.5 text-sm"
              >
                <span className="w-5 text-center font-bold text-hw-gray/70">
                  {row.rank}
                </span>
                <Link
                  href={`/bracket/${row.id}`}
                  className="flex-1 truncate font-semibold text-hw-black hover:text-hw-red hover:underline"
                >
                  {row.name}
                </Link>
                {anyLive && row.livePoints > 0 && (
                  <span className="text-xs font-bold text-hw-red">
                    +{row.livePoints}
                  </span>
                )}
                <span className="font-black tabular-nums">{row.points}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <h1 className="mb-1 text-xl font-black uppercase tracking-tight text-hw-black">
        Knockout Bracket
      </h1>
      <p className="mb-3 text-xs text-hw-gray">
        Live results. Numbers show how many of the {knockoutParticipants.length}{" "}
        entrants picked each team to win that match — hover or tap to see who.
        Pick points: R32 = 1, R16 = 2, QF = 3, finalist = 5, champion = 7; third
        place = 4 per team + 6 for the winner.
      </p>

      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setView(t.key)}
            className={`rounded-md px-3 py-1 text-xs font-black uppercase tracking-wide ${
              active === t.key
                ? "bg-hw-black text-white"
                : "bg-white text-hw-gray ring-1 ring-hw-khaki/50 hover:bg-hw-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "ALL" ? (
        // Full tree — break out of the page's max width so it fits desktop.
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-x-auto px-3 pb-3 sm:px-4">
          <div className="mx-auto flex min-w-max justify-center gap-2">
            {COLUMNS.map((rk) => (
              <div key={rk} className="flex flex-col">
                <div className="mb-2 text-center text-[11px] font-black uppercase tracking-wide text-hw-gray">
                  {roundName(rk)}
                  <span className="ml-1 font-semibold text-hw-gold">
                    {pointsFor(rk)}p
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-around gap-1">
                  {matchesByRound(rk).map((slot) => (
                    <div key={slot.match.id} className="w-32">
                      <MatchCard slot={slot} now={now} onTip={setTip} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 text-sm font-black uppercase tracking-wide text-hw-gray">
            {roundName(active)}
            <span className="ml-1 text-hw-gold">{pointsFor(active)}p per pick</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {[...matchesByRound(active)].sort(byKickoff).map((slot) => (
              <MatchCard key={slot.match.id} slot={slot} now={now} onTip={setTip} />
            ))}
          </div>
          {active === "F" && matchesByRound("3P")[0] && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-black uppercase tracking-wide text-hw-gray">
                Third place
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                <MatchCard
                  slot={matchesByRound("3P")[0]}
                  now={now}
                  onTip={setTip}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {tip && (
        <div
          className="pointer-events-none fixed z-50 max-h-64 w-48 -translate-y-1/2 overflow-auto rounded-md border border-hw-khaki bg-white p-2 text-xs shadow-lg"
          style={{ left: tip.x, top: tip.y }}
        >
          <div className="mb-1 font-black text-hw-black">{tip.label}</div>
          <ul className="space-y-0.5 text-hw-gray">
            {tip.names.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
