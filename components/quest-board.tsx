"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Check, CheckCircle2, Coins, Flame, Loader2, Lock, Snowflake, Sparkles,
  Swords, Target, Timer, Zap,
} from "lucide-react";
import { Badge, Card, Progress, SectionHead, cn } from "./ui";
import { useToast } from "./toast";
import { useCelebration } from "./celebrate";

type Quest = {
  key: string;
  title: string;
  description: string;
  metric: "lesson" | "quiz80" | "questions" | "trade" | "arena";
  target: number;
  credits: number;
  xp: number;
  progress: number;
  claimed: boolean;
  complete: boolean;
};

type Freeze = {
  cost: number;
  unused: number;
  used: number;
  boughtRecent: number;
  holdLimit: number;
  buyLimit: number;
  canBuy: boolean;
  history: Array<{ id: number; purchased_at: number; used_day: string | null }>;
};

const METRIC_ICON = {
  lesson: BookOpen,
  quiz80: Target,
  questions: Target,
  trade: Coins,
  arena: Swords,
} as const;

function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function QuestBoard({
  quests: initialQuests,
  resetAt,
  freeze: initialFreeze,
  streak,
}: {
  quests: Quest[];
  resetAt: number;
  freeze: Freeze;
  streak: number;
}) {
  const router = useRouter();
  const { push } = useToast();
  const { celebrate } = useCelebration();
  const [quests, setQuests] = useState(initialQuests);
  const [freeze, setFreeze] = useState(initialFreeze);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(resetAt - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resetAt]);

  const claimable = quests.filter((q) => q.complete && !q.claimed).length;
  const done = quests.filter((q) => q.claimed).length;
  const totalXp = useMemo(
    () => quests.reduce((sum, q) => sum + q.xp, 0),
    [quests]
  );

  async function claim(quest: Quest) {
    if (claiming || !quest.complete || quest.claimed) return;
    setClaiming(quest.key);
    try {
      const res = await fetch("/api/fun/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questKey: quest.key }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not claim that quest.");
      setQuests((prev) => prev.map((q) => (q.key === quest.key ? { ...q, claimed: true } : q)));
      push({
        tone: "reward",
        title: `Quest complete: ${quest.title}`,
        body: `+${quest.xp} XP and +${quest.credits} credits added.`,
      });
      celebrate({
        tone: "green",
        title: `+${quest.xp} XP · +${quest.credits} credits`,
        body: quest.title,
      });
      router.refresh();
    } catch (error) {
      push({
        tone: "error",
        title: "Claim failed",
        body: error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setClaiming(null);
    }
  }

  async function buyFreeze() {
    if (buying || !freeze.canBuy) return;
    setBuying(true);
    try {
      const res = await fetch("/api/fun/freeze", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not buy a streak freeze.");
      setFreeze(data.freezes as Freeze);
      push({
        tone: "success",
        title: "Streak freeze ready",
        body: "It is used automatically if you miss exactly one day.",
      });
      celebrate({
        tone: "violet",
        title: "Streak protected",
        body: `You now hold ${data.freezes?.unused ?? 1} freeze.`,
      });
      router.refresh();
    } catch (error) {
      push({
        tone: "error",
        title: "Purchase failed",
        body: error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Ready to claim</span>
              <Sparkles size={13} className="text-[#ffd08d]" />
            </div>
            <div className="num mt-2 text-[24px] font-semibold leading-none text-[#ffd08d]">{claimable}</div>
            <div className="mt-1 text-[10.5px] text-muted">of {quests.length} daily quests</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Claimed today</span>
              <CheckCircle2 size={13} className="text-[#5beeb9]" />
            </div>
            <div className="num mt-2 text-[24px] font-semibold leading-none text-[#5beeb9]">{done}</div>
            <div className="mt-1 text-[10.5px] text-muted">{totalXp} XP available today</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Resets in</span>
              <Timer size={13} className="text-[#7fdcff]" />
            </div>
            <div className="num mt-2 text-[24px] font-semibold leading-none text-[#7fdcff]">
              {remaining === null ? "--:--:--" : countdown(remaining)}
            </div>
            <div className="mt-1 text-[10.5px] text-muted">local midnight</div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.06] p-4 sm:px-5">
            <SectionHead
              title="Today's quests"
              subtitle="One habit, one skill, one market task. Progress comes from real activity only."
            />
          </div>
          <div className="divide-y divide-white/[0.05]">
            {quests.map((quest) => {
              const Icon = METRIC_ICON[quest.metric] ?? Target;
              const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
              return (
                <div key={quest.key} className={cn("p-4 sm:px-5", quest.claimed && "opacity-70")}>
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                        quest.claimed
                          ? "border-[rgba(47,227,160,.25)] bg-[rgba(47,227,160,.08)] text-[#5beeb9]"
                          : quest.complete
                            ? "border-[rgba(255,192,97,.28)] bg-[rgba(255,192,97,.08)] text-[#ffd08d]"
                            : "border-white/[0.08] bg-white/[0.03] text-muted"
                      )}
                    >
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[13px] font-semibold">{quest.title}</div>
                        {quest.claimed ? (
                          <Badge tone="green"><Check size={9} /> Claimed</Badge>
                        ) : quest.complete ? (
                          <Badge tone="amber"><Sparkles size={9} /> Ready</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{quest.description}</p>
                      <div className="mt-2.5 flex items-center gap-2.5">
                        <Progress
                          value={pct}
                          tone={quest.claimed ? "green" : quest.complete ? "amber" : "violet"}
                          className="max-w-[240px]"
                        />
                        <span className="num text-[10px] text-muted">
                          {quest.progress}/{quest.target}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="flex items-center gap-0.5 text-[#ffd08d]"><Zap size={10} /> {quest.xp}</span>
                        <span className="flex items-center gap-0.5 text-[#7fdcff]"><Coins size={10} /> {quest.credits}</span>
                      </div>
                      <button
                        onClick={() => claim(quest)}
                        disabled={!quest.complete || quest.claimed || claiming === quest.key}
                        className={cn(
                          "btn btn-sm",
                          quest.complete && !quest.claimed ? "btn-primary" : "btn-dark opacity-60"
                        )}
                      >
                        {claiming === quest.key ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : quest.claimed ? (
                          <Check size={12} />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        {quest.claimed ? "Done" : quest.complete ? "Claim" : "In progress"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="relative p-5">
            <div
              className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(127,220,255,.16), transparent 65%)" }}
            />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(127,220,255,.25)] bg-[rgba(127,220,255,.08)] text-[#7fdcff]">
                <Snowflake size={20} />
              </div>
              <div>
                <div className="text-[13px] font-semibold">Streak freeze</div>
                <div className="text-[10.5px] text-muted">{freeze.unused}/{freeze.holdLimit} held</div>
              </div>
            </div>
            <p className="relative mt-3 text-[11px] leading-relaxed text-muted">
              A freeze protects your streak if you miss exactly one calendar day. It is used
              automatically, and never invents a login.
            </p>
            <div className="relative mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-2.5">
                <div className="num text-[18px] font-semibold text-[#7fdcff]">{freeze.unused}</div>
                <div className="text-[9px] uppercase tracking-wider text-muted">Unused</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-2.5">
                <div className="num text-[18px] font-semibold text-muted">{freeze.used}</div>
                <div className="text-[9px] uppercase tracking-wider text-muted">Used</div>
              </div>
            </div>
            <button
              onClick={buyFreeze}
              disabled={!freeze.canBuy || buying}
              className={cn("btn mt-3 w-full", freeze.canBuy ? "btn-primary" : "btn-dark opacity-60")}
            >
              {buying ? <Loader2 size={13} className="animate-spin" /> : <Snowflake size={13} />}
              {freeze.canBuy ? `Buy freeze · ${freeze.cost} credits` : "Limit reached"}
            </button>
            <div className="relative mt-2 text-center text-[9.5px] text-muted">
              Max {freeze.buyLimit} purchases per 30 days. Bought recently: {freeze.boughtRecent}/{freeze.buyLimit}.
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(255,192,97,.25)] bg-[rgba(255,192,97,.08)] text-[#ffd08d]">
              <Flame size={20} />
            </div>
            <div>
              <div className="text-[13px] font-semibold">{streak}-day streak</div>
              <div className="text-[10.5px] text-muted">Sign in every calendar day</div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { label: "7 days", at: 7 },
              { label: "30 days", at: 30 },
              { label: "100 days", at: 100 },
            ].map((milestone) => (
              <div key={milestone.at} className="flex items-center gap-2">
                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border text-[8px]", streak >= milestone.at ? "border-[rgba(47,227,160,.5)] bg-[rgba(47,227,160,.18)] text-[#5beeb9]" : "border-white/10 text-muted")}>
                  {streak >= milestone.at ? <Check size={8} /> : ""}
                </span>
                <span className={cn("text-[11px]", streak >= milestone.at ? "text-ink" : "text-muted")}>
                  {milestone.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[9.5px] text-muted">
            <Lock size={9} /> Freezes apply once per missed day.
          </div>
        </Card>

        {freeze.history.length > 0 && (
          <Card className="p-4">
            <div className="eyebrow mb-2">Freeze history</div>
            <div className="space-y-1.5">
              {freeze.history.slice().reverse().map((row) => (
                <div key={row.id} className="flex items-center justify-between text-[10.5px]">
                  <span className="text-muted">{new Date(row.purchased_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <span className={row.used_day ? "text-[#ffd08d]" : "text-[#5beeb9]"}>
                    {row.used_day ? `Used ${row.used_day}` : "Available"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
