"use client";

import { useState } from "react";
import { knockoutParticipants, knockoutRounds, teams } from "@/lib/data";
import { flagUrl } from "@/lib/flags";
import { buildBracket, slotPickers, type BracketSlot } from "@/lib/knockout";
import { liveMinute } from "@/lib/liveMinute";
import type { RoundKey } from "@/lib/types";
import { useResults } from "./useResults";

const COLUMNS: RoundKey[] = ["R32", "R16", "QF", "SF", "F"];

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
    // Flip to the chip's left when the tooltip would run off-screen.
    const x =
      right + TIP_W > window.innerWidth ? r.left - TIP_W - 8 : right;
    onTip({
      label: `${name} — ${pickers.length} pick${pickers.length === 1 ? "" : "s"}`,
      names: pickers,
      x,
      y: r.top + r.height / 2,
    });
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 ${
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
      className={`w-40 overflow-hidden rounded-md border bg-white text-xs shadow-sm ${
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
  const slots = buildBracket(payload?.results ?? []);
  const matchesByRound = (rk: RoundKey) =>
    [...slots.values()]
      .filter((s) => s.match.round === rk)
      .sort((a, b) => a.match.slot - b.match.slot);
  const now = payload ? Date.parse(payload.fetchedAt) : 0;
  const thirdPlace = matchesByRound("3P")[0];
  const pointsFor = (rk: RoundKey) =>
    knockoutRounds.find((r) => r.key === rk)?.points ?? 0;

  return (
    <div>
      <h1 className="mb-1 text-xl font-black uppercase tracking-tight text-hw-black">
        Knockout Bracket
      </h1>
      <p className="mb-4 text-xs text-hw-gray">
        Live results. Numbers show how many of the {knockoutParticipants.length}{" "}
        entrants picked each team to win that match — hover or tap to see who.
        Pick points: R32 = 1, R16 = 2, QF = 3, finalist = 5, champion = 7; third
        place = 4 per team + 6 for the winner.
      </p>
      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-max gap-3">
          {COLUMNS.map((rk) => (
            <div key={rk} className="flex flex-col">
              <div className="mb-2 text-center text-[11px] font-black uppercase tracking-wide text-hw-gray">
                {knockoutRounds.find((r) => r.key === rk)?.name}
                <span className="ml-1 font-semibold text-hw-gold">
                  {pointsFor(rk)}p
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-around gap-2">
                {matchesByRound(rk).map((slot) => (
                  <MatchCard
                    key={slot.match.id}
                    slot={slot}
                    now={now}
                    onTip={setTip}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {thirdPlace && (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-hw-gray">
            Third place
          </div>
          <MatchCard slot={thirdPlace} now={now} onTip={setTip} />
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
