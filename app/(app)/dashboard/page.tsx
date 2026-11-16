import Link from "next/link";
import { ArrowRight, BookOpen, CandlestickChart, ShoppingBag, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  getActivity, getAssets, getFeaturedPrediction, getLeaderboard, getModules,
  getPortfolio, getPortfolioHistory, getPredictionStats, getRecentPredictions, getUserRank,
} from "@/lib/data";
import { one } from "@/lib/db";
import { isPremium } from "@/lib/plans";
import { getDailyQuests } from "@/lib/fun/quests";
import { freezeStatus } from "@/lib/fun/streak-freeze";
import { lightningSummary } from "@/lib/fun/lightning";
import { getLeague } from "@/lib/fun/leagues";
import { bossStatus } from "@/lib/fun/bosses";
import { hiloFor } from "@/lib/fun/hilo";
import { getCertificate } from "@/lib/exam";
import { modeName } from "@/lib/finance";
import { Badge } from "@/components/ui";
import { HiloCardView } from "@/components/hilo";
import { DailyStrip } from "@/components/daily-strip";
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

  const premium = isPremium(user);
  const daily = getDailyQuests(user);
  const freeze = freezeStatus(user.id);
  const lightning = lightningSummary(user.id);
  const certificate = getCertificate(user.id);
  const modulesDone = modules.filter((m) => m.status === "completed").length;
  const allComplete = modules.length > 0 && modulesDone >= modules.length;
  const boss = premium ? bossStatus(user) : null;
  const league = premium ? getLeague(user) : null;
  const trades = one<{ c: number }>("SELECT COUNT(*) AS c FROM orders WHERE user_id = ?", user.id)?.c ?? 0;

  const hilo = hiloFor(
    {
      name: user.name,
      hour: new Date().getHours(),
      streak: user.streak,
      freezeUnused: freeze.unused,
      questsClaimable: daily.claimable,
      questsDone: daily.done,
      modulesDone,
      modulesTotal: modules.length,
      nextModuleTitle: nextModule?.title ?? null,
      lightningBest: lightning.best,
      lightningRuns: lightning.runs,
      hasTraded: trades > 0,
      certificateReady: premium && allComplete && !certificate,
      certificates: certificate ? 1 : 0,
      premium,
      league: league
        ? {
            tierLabel: league.tierLabel,
            rank: league.myRank,
            size: league.cohortSize,
            daysLeft: Math.max(0, Math.ceil((league.endsAt - Date.now()) / 86_400_000)),
          }
        : null,
      boss: boss
        ? { name: boss.boss.name, daysLeft: boss.daysLeft, passed: boss.passed, premium: boss.premium }
        : null,
    },
    daily.dayKey
  );

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
        <HiloCardView card={hilo} />
        <div className="xl:col-span-2">
          <DailyStrip
            quests={daily.quests}
            claimable={daily.claimable}
            freezeUnused={freeze.unused}
            streak={user.streak}
          />
        </div>
      </div>

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
