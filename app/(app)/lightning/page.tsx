import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isPremium } from "@/lib/plans";
import { lightningSummary } from "@/lib/fun/lightning";
import { LightningGame } from "@/components/lightning-game";
import { PremiumGate } from "@/components/premium-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lightning round — MockTrade Matrix",
  description: "Twelve curriculum questions, sixty seconds, server-scored. A fast drill inside the Premium tier.",
  robots: { index: false, follow: false },
};

export default async function LightningPage() {
  const user = await requireUser();
  const premium = isPremium(user);

  if (!premium) {
    return (
      <PremiumGate
        eyebrow="Lightning round"
        icon={<Zap size={11} />}
        title="Lightning Round is part of Premium"
        body="A sixty-second drill over the published curriculum. The timer and scoring live on the server, and rewards pay for the first three rounds each day."
        features={[
          "12 questions drawn from published modules",
          "60-second server timer with a hard stop",
          "Personal best and daily reward cap",
          "Full answer review after every run",
        ]}
      />
    );
  }

  const summary = lightningSummary(user.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Zap size={11} /> Play · Premium</div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
            Lightning round
          </h1>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-muted">
            Twelve questions. Sixty seconds. The fastest honest signal of what you actually know.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="chip chip-violet"><Zap size={9} /> Best {summary.best}/12</div>
          <div className="chip chip-cyan">{summary.runs} run{summary.runs === 1 ? "" : "s"}</div>
        </div>
      </div>

      <LightningGame premium summary={summary} />

      <p className="px-1 text-[10px] leading-relaxed text-muted">
        Rewards are paid for the first three submitted rounds each local day. Practice rounds still
        update your personal best and badge progress. The answer key is never sent to the browser.
      </p>
    </div>
  );
}
