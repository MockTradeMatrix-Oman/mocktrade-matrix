import { requireUser } from "@/lib/auth";
import {
  getArenaLeaderboard,
  getArenaRank,
  getArenaStats,
  getPowerupInventory,
  getRecentArenaMatches,
} from "@/lib/arena";
import { defaultArenaRegion } from "@/lib/regions";
import { Arena } from "@/components/arena";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quiz arena · MockTrade Matrix",
  description: "Global skill-based live quiz battles. Beat a real player from anywhere, win credits, fund your simulated portfolio.",
};

export default async function ArenaPage() {
  const user = await requireUser();
  const marketRegion = user.region === "US" ? "US" : "IN";
  const arenaRegion = user.arena_region || defaultArenaRegion(marketRegion);
  const stats = getArenaStats(user.id);
  const rank = getArenaRank(user.id, arenaRegion);
  const ladder = getArenaLeaderboard(arenaRegion, 12);
  const inventory = getPowerupInventory(user.id);
  const history = getRecentArenaMatches(user.id, 6);

  return (
    <Arena
      user={{
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        arenaRegion,
        marketRegion,
        credits: user.credits,
        rating: stats?.rating ?? 1000,
      }}
      stats={
        stats
          ? {
              matches: stats.matches,
              wins: stats.wins,
              losses: stats.losses,
              draws: stats.draws,
              correct: stats.correct,
              answered: stats.answered,
              credits_won: stats.credits_won,
              best_streak: stats.best_streak,
              rating: stats.rating,
            }
          : null
      }
      rank={rank}
      ladder={ladder.map((row) => ({ ...row }))}
      inventory={{ ...inventory }}
      history={history.map((row) => ({ ...row }))}
    />
  );
}
