import type { Metadata } from "next";
import { Medal } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isPremium } from "@/lib/plans";
import { getLeague } from "@/lib/fun/leagues";
import { LeagueView } from "@/components/league-view";
import { PremiumGate } from "@/components/premium-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weekly leagues — MockTrade Matrix",
  description: "Twenty-person XP cohorts with weekly promotion and demotion across bronze, silver, gold and diamond.",
  robots: { index: false, follow: false },
};

export default async function LeaguesPage() {
  const user = await requireUser();
  const premium = isPremium(user);

  if (!premium) {
    return (
      <PremiumGate
        eyebrow="Weekly leagues"
        icon={<Medal size={11} />}
        title="Weekly leagues are part of Premium"
        body="Compete against real learners in twenty-person cohorts, climb from bronze to diamond, and earn promotion on weekly XP — not on a purchased rank."
        features={[
          "Cohorts of at most twenty real learners",
          "Top 5 promote, bottom 5 demote once the week closes",
          "Weekly XP snapshot on join, so late joins are fair",
          "Bronze never demotes; diamond never promotes",
        ]}
      />
    );
  }

  const league = getLeague(user);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Medal size={11} /> Play · Premium</div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
            Weekly leagues
          </h1>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-muted">
            A fresh cohort every UTC week. XP comes from lessons, quizzes, Lightning Rounds, boss
            clears, quests and sandbox trades — never from a purchase.
          </p>
        </div>
        <div className="chip chip-violet"><Medal size={9} /> {league.tierLabel} · cohort {league.cohort + 1}</div>
      </div>

      <LeagueView league={league} />

      <p className="px-1 text-[10px] leading-relaxed text-muted">
        Promotion and demotion resolve once, on the first visit after the week closes. Ties break by
        the earlier join time. There are no bots or filler members in a cohort.
      </p>
    </div>
  );
}
