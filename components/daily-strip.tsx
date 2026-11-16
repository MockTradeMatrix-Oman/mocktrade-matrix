import Link from "next/link";
import { ArrowRight, Check, Flame, ListChecks, Snowflake, Sparkles, Target, Timer } from "lucide-react";
import { Badge, Card, Progress, SectionHead } from "./ui";

type Quest = {
  key: string;
  title: string;
  credits: number;
  xp: number;
  progress: number;
  target: number;
  complete: boolean;
  claimed: boolean;
};

export function DailyStrip({
  quests,
  claimable,
  freezeUnused,
  streak,
}: {
  quests: Quest[];
  claimable: number;
  freezeUnused: number;
  streak: number;
}) {
  const done = quests.filter((q) => q.claimed).length;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] p-4">
        <SectionHead
          title="Daily quests"
          subtitle="One habit, one skill, one market task. Real activity only."
        />
        <div className="flex items-center gap-2">
          {claimable > 0 ? (
            <Badge tone="amber"><Sparkles size={9} /> {claimable} ready</Badge>
          ) : (
            <Badge tone="green"><Check size={9} /> {done}/3 claimed</Badge>
          )}
          <Link href="/quests" className="btn btn-dark btn-sm">
            Open <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {quests.map((quest) => {
          const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
          return (
            <div key={quest.key} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={
                  quest.claimed
                    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.08)] text-[#5beeb9]"
                    : quest.complete
                      ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,192,97,.3)] bg-[rgba(255,192,97,.08)] text-[#ffd08d]"
                      : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-muted"
                }
              >
                {quest.claimed ? <Check size={12} /> : <Target size={12} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11.5px] font-medium">{quest.title}</div>
                <div className="mt-1 flex items-center gap-2">
                  <Progress
                    value={pct}
                    tone={quest.claimed ? "green" : quest.complete ? "amber" : "violet"}
                    className="max-w-[180px]"
                  />
                  <span className="num text-[9.5px] text-muted">{quest.progress}/{quest.target}</span>
                </div>
              </div>
              <div className="hidden shrink-0 text-right text-[9.5px] text-muted sm:block">
                <div className="text-[#ffd08d]">+{quest.xp} XP</div>
                <div className="text-[#7fdcff]">+{quest.credits} cr</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-2.5 text-[9.5px] text-muted">
        <span className="flex items-center gap-1.5"><Flame size={11} className="text-[#ffd08d]" /> {streak}-day streak</span>
        <span className="flex items-center gap-1.5"><Snowflake size={11} className="text-[#7fdcff]" /> {freezeUnused} freeze{freezeUnused === 1 ? "" : "s"} held</span>
        <span className="flex items-center gap-1.5"><Timer size={11} /> Resets at local midnight</span>
      </div>
    </Card>
  );
}

export function DailyStripSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <ListChecks size={12} /> Quests load with your account.
      </div>
    </Card>
  );
}
