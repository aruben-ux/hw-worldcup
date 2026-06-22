import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import LiveTicker from "@/components/LiveTicker";
import { POT, participants } from "@/lib/data";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  title: "HW World Cup 2026 Pool",
  description:
    "Live leaderboard for the Harvard-Westlake World Cup 2026 group-stage picks pool",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sourceSans.variable}>
      <body className="min-h-screen bg-hw-cream text-hw-black antialiased">
        <header className="border-b-4 border-hw-gold bg-hw-black text-white">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link
              href="/"
              className="text-lg font-black uppercase tracking-tight"
            >
              <span className="text-hw-red">HW</span> World Cup Pool
            </Link>
            <nav className="flex items-center gap-4 text-sm font-semibold">
              <Link href="/" className="hover:text-hw-gold">
                Leaderboard
              </Link>
              <Link href="/matches" className="hover:text-hw-gold">
                Matches
              </Link>
              <span className="rounded-md bg-hw-gold px-2.5 py-0.5 text-xs font-black text-hw-black">
                ${POT} pot · {participants.length} players
              </span>
            </nav>
          </div>
        </header>
        <LiveTicker />
        <main className="mx-auto max-w-3xl px-3 py-5 sm:px-4">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
