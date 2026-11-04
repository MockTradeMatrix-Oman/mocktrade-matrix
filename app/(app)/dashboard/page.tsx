import Link from "next/link";
import { ArrowRight, BookOpen, CandlestickChart, ShoppingBag, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  getActivity, getAssets, getFeaturedPrediction, getLeaderboard, getModules,
  getPortfolio, getPortfolioHistory, getPredictionStats, getRecentPredictions, getUserRank,
} from "@/lib/data";
import { modeName } from "@/lib/finance";
import { Badge } from "@/components/ui";
import {
  ActivityFeed, AiSignalCard, CrashTrainingBanner, CreditsCard, HoldingsMini,
  LadderPreview, LeaderboardCard, MarketPulse, PortfolioHero,
} from "@/components/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const portfolio = getPortfolio(user);
  const history = getPortfolioHistory(user, 180);
  const modules = getModules(user.id);
  const activity = getActivity(6);
  const board = getLeaderboard(undefined, 5);
  const rank = getUserRank(user.id);
  const prediction = getFeaturedPrediction();
  const accuracy = getPredictionStats().accuracy;
  const recent = getRecentPredictions(8);
  const assets = getAssets();
  const nextModule = modules.find((m) => m.status === "unlocked") ?? modules.find((m) => m.status === "locked") ?? null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{greeting}, {user.name.split(" ")[0]}.</h1>
            <Badge tone="green"><Sparkles size={10} /> {modeName(user.mode)}</Badge>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · Your market is open and simulating.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/shop" className="btn btn-ghost btn-sm"><ShoppingBag size={13} /> Shop</Link>
          <Link href="/trade" className="btn btn-ghost btn-sm"><CandlestickChart size={13} /> Terminal</Link>
          <Link href="/learn" className="btn btn-primary btn-sm"><BookOpen size={13} /> Continue learning <ArrowRight size={13} /></Link>
        </div>
      </div>

      <CrashTrainingBanner done={Boolean(user.crash_done)} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PortfolioHero
            positions={portfolio.positions}
            cash={portfolio.cash}
            history={history}
            region={user.region}
            name={user.name}
            rank={rank ? { rank: rank.rank, returnPct: rank.returnPct } : null}
          />
        </div>
        <CreditsCard
          credits={user.credits}
          xp={user.xp}
          streak={user.streak}
          nextModule={nextModule ? { title: nextModule.title, slug: nextModule.slug, cost: nextModule.unlock_cost } : null}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <MarketPulse meta={assets.map((a) => ({ symbol: a.symbol, name: a.name, class: a.class }))} region={user.region} />
        <HoldingsMini positions={portfolio.positions} cash={portfolio.cash} region={user.region} />
        <AiSignalCard
          prediction={prediction ? {
            symbol: prediction.symbol, name: prediction.name, direction: prediction.direction,
            confidence: prediction.confidence, target_price: prediction.target_price, start_price: prediction.start_price,
          } : null}
          accuracy={accuracy}
          recent={recent.map((r) => ({ id: r.id, correct: r.correct, symbol: r.symbol }))}
          region={user.region}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="lg:col-span-1 xl:col-span-1">
          <LadderPreview modules={modules} />
        </div>
        <ActivityFeed items={activity} />
        <LeaderboardCard rows={board} meId={user.id} region={user.region} />
      </div>
    </div>
  );
}
