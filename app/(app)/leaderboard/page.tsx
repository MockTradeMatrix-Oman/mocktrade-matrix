import { requireUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/data";
import { getArenaLeaderboards } from "@/lib/arena";
import { defaultArenaRegion } from "@/lib/regions";
import { Leaderboard } from "@/components/leaderboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard · MockTrade Matrix",
  description: "Global skill-based quiz battles, region-wise quiz ladders and portfolio returns for real learner accounts.",
};

export default async function LeaderboardPage() {
  const user = await requireUser();

  return (
    <Leaderboard
      user={{
        id: user.id,
        name: user.name,
        arenaRegion: user.arena_region || defaultArenaRegion(user.region),
      }}
      arena={getArenaLeaderboards(25)}
      portfolio={{
        IN: getLeaderboard("IN", 25).map((row) => ({ ...row })),
        US: getLeaderboard("US", 25).map((row) => ({ ...row })),
      }}
    />
  );
}
