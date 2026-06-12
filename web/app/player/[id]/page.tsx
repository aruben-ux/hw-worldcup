import PlayerDetail from "@/components/PlayerDetail";
import { participants } from "@/lib/data";

export function generateStaticParams() {
  return participants.map((p) => ({ id: p.id }));
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlayerDetail playerId={id} />;
}
