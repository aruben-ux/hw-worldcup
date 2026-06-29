"use client";

import { useState } from "react";
import { teams } from "@/lib/data";
import { flagUrl } from "@/lib/flags";
import type { TitleContender } from "@/lib/knockout";

function Crest({ code }: { code: string }) {
  const crest = teams[code]?.crest;
  const url = flagUrl(code);
  if (crest)
    // eslint-disable-next-line @next/next/no-img-element -- tiny crest icon
    return <img src={crest} alt="" className="h-5 w-5 object-contain" loading="lazy" />;
  if (url)
    // eslint-disable-next-line @next/next/no-img-element -- tiny flag icon
    return <img src={url} alt="" className="h-3.5 w-auto rounded-[1px]" loading="lazy" />;
  return <span className="h-5 w-5" />;
}

export default function TitleRace({
  contenders,
}: {
  contenders: TitleContender[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (contenders.length === 0) return null;
  const total = contenders.reduce((s, c) => s + c.count, 0);
  const max = Math.max(...contenders.map((c) => c.count));

  return (
    <section className="mb-5 overflow-hidden rounded-lg bg-white shadow">
      <h2 className="bg-hw-black px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
        Title Race — who&apos;s backing the champion
      </h2>
      <ul className="divide-y divide-hw-khaki/30">
        {contenders.map((c) => {
          const name = teams[c.code]?.name ?? c.code;
          const isOpen = open === c.code;
          return (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : c.code)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-hw-cream/60"
                aria-expanded={isOpen}
              >
                <Crest code={c.code} />
                <span
                  className={`font-semibold ${
                    c.isChampion
                      ? "text-hw-gold"
                      : c.alive
                        ? "text-hw-black"
                        : "text-hw-gray/50 line-through"
                  }`}
                >
                  {name}
                </span>
                {c.isChampion ? (
                  <span className="rounded bg-hw-gold px-1.5 text-[10px] font-black uppercase text-hw-black">
                    Champion
                  </span>
                ) : !c.alive ? (
                  <span className="rounded bg-hw-red/10 px-1.5 text-[10px] font-bold uppercase text-hw-red">
                    Out
                  </span>
                ) : null}
                <span className="ml-auto flex items-center gap-2">
                  <span className="hidden h-2 w-24 overflow-hidden rounded-full bg-hw-cream sm:block">
                    <span
                      className={`block h-full ${c.alive ? "bg-hw-green" : "bg-hw-gray/40"}`}
                      style={{ width: `${(c.count / max) * 100}%` }}
                    />
                  </span>
                  <span className="w-14 text-right text-xs tabular-nums text-hw-gray">
                    {c.count} ({Math.round((c.count / total) * 100)}%)
                  </span>
                </span>
              </button>
              {isOpen && (
                <ul className="bg-hw-cream/40 px-3 pb-2 pl-10 text-xs text-hw-gray">
                  {c.names.map((n) => (
                    <li key={n} className="py-0.5">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
