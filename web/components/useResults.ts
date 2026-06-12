"use client";

import { useEffect, useState } from "react";
import type { ResultsPayload } from "@/lib/types";

const REFRESH_MS = 60_000;

export function useResults(): {
  payload: ResultsPayload | null;
  error: string | null;
} {
  const [payload, setPayload] = useState<ResultsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/results", { cache: "no-store" });
        if (!res.ok) throw new Error(`results API: ${res.status}`);
        const data = (await res.json()) as ResultsPayload;
        if (!cancelled) {
          setPayload(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return { payload, error };
}
