import type { Metadata } from "next";
import { ListChecks, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDailyQuests } from "@/lib/fun/quests";
import { freezeStatus } from "@/lib/fun/streak-freeze";
import { QuestBoard } from "@/components/quest-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily quests — MockTrade Matrix",
  description: "Three real tasks each day: one habit, one skill, one market. Claim XP and credits from activity you actually finished.",
  robots: { index: false, follow: false },
};

export default async function QuestsPage() {
  const user = await requireUser();
  const daily = getDailyQuests(user);
  const freeze = freezeStatus(user.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><ListChecks size={11} /> Play · free</div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
            Daily quests
          </h1>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-muted">
            Three quests rotate every local calendar day. Every point of progress comes from a lesson,
            quiz, trade or arena match you actually completed — nothing is simulated for the quest board.
          </p>
        </div>
        <div className="chip chip-amber"><Sparkles size={9} /> {daily.claimable} ready to claim</div>
      </div>

      <QuestBoard
        quests={daily.quests}
        resetAt={daily.resetAt}
        freeze={freeze}
        streak={user.streak}
      />

      <p className="px-1 text-[10px] leading-relaxed text-muted">
        Quests reset at local midnight. Unclaimed quests do not carry over. Streak freezes are bought
        with earned credits, hold a maximum of two, and can never create a login that did not happen.
        Credits are practice currency and never convert to real money.
      </p>
    </div>
  );
}
