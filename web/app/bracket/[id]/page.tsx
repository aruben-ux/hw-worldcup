import PlayerBracket from "@/components/PlayerBracket";
import { knockoutParticipants } from "@/lib/data";

export function generateStaticParams() {
  return knockoutParticipants.map((p) => ({ id: p.id }));
}

export default async function PlayerBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlayerBracket playerId={id} />;
}
