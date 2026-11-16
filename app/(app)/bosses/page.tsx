import type { Metadata } from "next";
import { Skull } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isPremium } from "@/lib/plans";
import { bossHistory, bossStatus } from "@/lib/fun/bosses";
import { BossBattle } from "@/components/boss-battle";
import { PremiumGate } from "@/components/premium-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boss battles — MockTrade Matrix",
  description: "A monthly hard paper from the authored assessment bank, with a timer and a 70% pass mark.",
  robots: { index: false, follow: false },
};

export default async function BossesPage() {
  const user = await requireUser();
  const premium = isPremium(user);

  if (!premium) {
    return (
      <PremiumGate
        eyebrow="Boss battles"
        icon={<Skull size={11} />}
        title="Boss battles are part of Premium"
        body="One hard boss each month, drawn from the authored final-assessment bank. Eight minutes, ten questions, a 70% pass mark, and a reward for the first clear."
        features={[
          "Hard questions first, from the real assessment bank",
          "8-minute server timer and server scoring",
          "First clear each month pays XP and credits",
          "Free retakes with a full explanation review",
        ]}
      />
    );
  }

  const status = bossStatus(user);
  const history = bossHistory(user.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Skull size={11} /> Play · Premium</div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
            Boss battles
          </h1>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-muted">
            The curriculum gets a harder edge. Each month a new scenario boss tests the same ideas
            under time pressure — with a real pass mark and no participation reward.
          </p>
        </div>
        <div className="chip chip-amber"><Skull size={9} /> {status.boss.name}</div>
      </div>

      <BossBattle status={status} history={history} />

      <p className="px-1 text-[10px] leading-relaxed text-muted">
        A boss paper is fixed when the attempt starts, so a bank edit cannot change a live battle.
        Reward credits are practice currency and never convert to real money.
      </p>
    </div>
  );
}
