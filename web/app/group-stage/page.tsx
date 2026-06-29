import Link from "next/link";
import Leaderboard from "@/components/Leaderboard";
import MatchesBoard from "@/components/MatchesBoard";

export default function GroupStagePage() {
  return (
    <div>
      <div className="mb-4 rounded-md border border-hw-khaki/50 bg-hw-cream px-3 py-2 text-sm text-hw-gray">
        <span className="font-black uppercase tracking-wide text-hw-black">
          Group stage
        </span>{" "}
        — final standings, archived. The pool has moved on to the{" "}
        <Link href="/" className="font-semibold text-hw-red hover:underline">
          knockout bracket
        </Link>
        .
      </div>
      <Leaderboard />
      <h2 className="mb-3 mt-8 text-lg font-black uppercase tracking-tight text-hw-black">
        Group-stage matches
      </h2>
      <MatchesBoard />
    </div>
  );
}
