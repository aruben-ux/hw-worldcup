// Match kickoff times are shown in Pacific time. America/Los_Angeles
// gives the correct Pacific wall-clock, including daylight saving — during
// the 2026 World Cup (June–July) that's PDT (UTC-7).
const PT = "America/Los_Angeles";

/** "12:00 PM" in Pacific time. */
export const ptTime = (utc: string) =>
  new Date(utc).toLocaleTimeString("en-US", {
    timeZone: PT,
    hour: "numeric",
    minute: "2-digit",
  });

/** "6/28" in Pacific time. */
export const ptDateShort = (utc: string) =>
  new Date(utc).toLocaleDateString("en-US", {
    timeZone: PT,
    month: "numeric",
    day: "numeric",
  });

/** "Sun, June 28" in Pacific time. */
export const ptDateLong = (utc: string) =>
  new Date(utc).toLocaleDateString("en-US", {
    timeZone: PT,
    weekday: "short",
    month: "long",
    day: "numeric",
  });

/** "2026-06-28" Pacific calendar day, for grouping. */
export const ptDayKey = (utc: string) =>
  new Date(utc).toLocaleDateString("en-CA", { timeZone: PT });
