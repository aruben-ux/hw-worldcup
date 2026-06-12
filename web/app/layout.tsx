import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { POT, participants } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "WC 2026 Pool",
  description:
    "Live leaderboard for the World Cup 2026 group-stage picks pool",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        <header className="bg-slate-900 text-white">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="text-lg font-extrabold tracking-tight">
              ⚽ WC 2026 Pool
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="hover:text-amber-300">
                Leaderboard
              </Link>
              <Link href="/matches" className="hover:text-amber-300">
                Matches
              </Link>
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-slate-900">
                ${POT} pot · {participants.length} players
              </span>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-3 py-5 sm:px-4">{children}</main>
      </body>
    </html>
  );
}
