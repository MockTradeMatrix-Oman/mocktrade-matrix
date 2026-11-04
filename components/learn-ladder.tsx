"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight, BookOpen, Check, ChevronRight, Clock, GraduationCap, Lock, Play,
  Sparkles, Trophy, Unlock, Zap,
} from "lucide-react";
import { Badge, Card, Progress, SectionHead, cn } from "./ui";
import { useToast } from "./toast";
import { levelFromXp } from "@/lib/finance";

export type LearnModule = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  order_index: number;
  minutes: number;
  reward_credits: number;
  unlock_cost: number;
  questions: number;
  status: string;
  score: number;
  is_free: number;
};

const LEVEL_TONE: Record<string, { chip: string; bar: string; dot: string }> = {
  Foundation: { chip: "text-[#5beeb9]", bar: "bg-[#2fe3a0]", dot: "bg-[#2fe3a0]" },
  Intermediate: { chip: "text-[#b3a8ff]", bar: "bg-[#8b7bff]", dot: "bg-[#8b7bff]" },
  Advanced: { chip: "text-[#ffd08d]", bar: "bg-[#ffc061]", dot: "bg-[#ffc061]" },
};

export function LearnLadder({
  modules,
  credits,
  xp,
  streak,
}: {
  modules: LearnModule[];
  credits: number;
  xp: number;
  streak: number;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [localCredits, setLocalCredits] = useState(credits);

  const completed = modules.filter((m) => m.status === "completed");
  const active = modules.find((m) => m.status === "unlocked") ?? modules.find((m) => m.status === "locked");
  const totalMinutes = modules.reduce((s, m) => s + m.minutes, 0);
  const totalQuestions = modules.reduce((s, m) => s + m.questions, 0);
  const level = levelFromXp(xp);
  const next = active ?? modules.find((m) => m.status !== "completed");
  const pct = modules.length ? (completed.length / modules.length) * 100 : 0;

  const groups = useMemo(() => {
    const map = new Map<string, LearnModule[]>();
    for (const m of modules) {
      if (!map.has(m.level)) map.set(m.level, []);
      map.get(m.level)!.push(m);
    }
    return Array.from(map.entries());
  }, [modules]);

  async function unlock(mod: LearnModule) {
    setBusyId(mod.id);
    try {
      const res = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock", moduleId: mod.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not unlock module.");
      if (typeof data.credits === "number") setLocalCredits(data.credits);
      push({ tone: "success", title: "Module unlocked", body: `${mod.title} is ready for you.` });
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Unlock failed", body: err.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">Learning ladder</h1>
            <Badge tone="green"><GraduationCap size={10} /> {completed.length}/{modules.length} complete</Badge>
          </div>
          <p className="mt-1 text-[12px] text-muted">Pass a quiz to earn credits. Spend credits to unlock the next rung. Credits are never for sale.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.08)] px-2.5 py-1.5 text-[11px] font-semibold text-[#ffd08d]">
            <Zap size={12} /> {localCredits} credits
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-muted">
            <Trophy size={12} className="text-[#ffd08d]" /> Lv {level.level}
          </span>
        </div>
      </div>

      {/* overview */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,123,255,.14), transparent 65%)" }} />
          <div className="relative p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow">Your curriculum</div>
                <div className="mt-1 text-[15px] font-semibold">{next ? `Next up · ${next.title}` : "Every module complete"}</div>
                <div className="mt-1 text-[11px] text-muted">
                  {next ? `${next.subtitle}` : "Revisit any module to keep the mechanics sharp."}
                </div>
              </div>
              {next && (
                <Link href={`/learn/${next.slug}`} className="btn btn-primary btn-sm shrink-0">
                  {next.status === "unlocked" ? "Continue" : "Preview"} <ArrowRight size={13} />
                </Link>
              )}
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>{completed.length} of {modules.length} modules</span>
                <span className="num">{Math.round(pct)}%</span>
              </div>
              <Progress value={pct} className="mt-1.5" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Modules", `${modules.length}`, GraduationCap],
                ["Minutes", `${totalMinutes}`, Clock],
                ["Questions", `${totalQuestions}`, BookOpen],
                ["Streak", `${streak}d`, Sparkles],
              ].map(([label, value, Icon]) => {
                const I = Icon as React.ComponentType<{ size?: number; className?: string }>;
                return (
                  <div key={label as string} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <I size={12} className="text-muted" />
                    <div className="num mt-1.5 text-[14px] font-semibold leading-none">{value as string}</div>
                    <div className="mt-1 text-[8.5px] uppercase tracking-[0.1em] text-muted">{label as string}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHead title="How credits work" subtitle="Attention is the currency" />
          <div className="mt-3 space-y-2.5">
            {[
              { icon: Check, title: "Pass a quiz", body: "Score at least 66% to clear a module.", tone: "green" },
              { icon: Zap, title: "Earn credits", body: "Perfect score pays full reward; a pass pays 60%.", tone: "amber" },
              { icon: Unlock, title: "Unlock the next rung", body: "Advanced modules cost credits, never cash.", tone: "violet" },
            ].map((s) => (
              <div key={s.title} className="flex items-start gap-2.5">
                <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                  s.tone === "green" ? "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.07)] text-[#5beeb9]"
                    : s.tone === "amber" ? "border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.07)] text-[#ffd08d]"
                    : "border-[rgba(139,123,255,.2)] bg-[rgba(139,123,255,.07)] text-[#b3a8ff]")}>
                  <s.icon size={12} />
                </span>
                <div>
                  <div className="text-[11px] font-semibold">{s.title}</div>
                  <div className="text-[10px] leading-relaxed text-muted">{s.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-white/[0.05] bg-black/20 p-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted">Level progress</span>
              <span className="num font-semibold text-[#8df5d0]">{xp} XP</span>
            </div>
            <Progress value={level.progress * 100} className="mt-1.5" />
            <div className="mt-1 text-[9px] text-muted/70">{level.ceil - xp} XP to level {level.level + 1}</div>
          </div>
        </Card>
      </div>

      {/* ladder */}
      <div className="space-y-4">
        {groups.map(([levelName, list]) => {
          const tone = LEVEL_TONE[levelName] ?? LEVEL_TONE.Foundation;
          return (
            <Card key={levelName} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
                <div className="flex items-center gap-2.5">
                  <span className={cn("h-2 w-2 rounded-full", tone.dot)} />
                  <div>
                    <div className={cn("text-[12px] font-semibold", tone.chip)}>{levelName}</div>
                    <div className="text-[9.5px] text-muted">{list.length} modules · {list.reduce((s, m) => s + m.minutes, 0)} minutes</div>
                  </div>
                </div>
                <span className="text-[9.5px] text-muted">
                  {list.filter((m) => m.status === "completed").length}/{list.length} done
                </span>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {list.map((m, i) => {
                  const done = m.status === "completed";
                  const unlocked = m.status === "unlocked";
                  const locked = m.status === "locked";
                  return (
                    <div key={m.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3 transition", unlocked && "bg-[rgba(255,192,97,.03)]")}>
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                        done ? "border-[rgba(47,227,160,.4)] bg-[rgba(47,227,160,.14)] text-[#5beeb9]"
                          : unlocked ? "border-[rgba(255,192,97,.4)] bg-[rgba(255,192,97,.12)] text-[#ffd08d]"
                          : "border-white/[0.08] bg-[#0b0f17] text-muted/50")}>
                        {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn("text-[12px] font-semibold", locked && "text-muted/70")}>{m.title}</span>
                          {done && <span className="chip chip-green !py-0 !text-[8.5px]">score {m.score}%</span>}
                          {unlocked && <span className="chip chip-amber !py-0 !text-[8.5px]">in progress</span>}
                          {locked && <Lock size={10} className="text-muted/40" />}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-muted">{m.subtitle}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] text-muted/70">
                          <span className="flex items-center gap-1"><Clock size={9} /> {m.minutes} min</span>
                          <span className="flex items-center gap-1"><BookOpen size={9} /> {m.questions} questions</span>
                          <span className="flex items-center gap-1 text-[#ffd08d]/80"><Zap size={9} /> {m.reward_credits} credits</span>
                          {locked && m.unlock_cost > 0 && <span className="text-[#b3a8ff]/80">unlock {m.unlock_cost} credits</span>}
                          {locked && m.unlock_cost === 0 && <span className="text-[#5beeb9]/80">free to open</span>}
                        </div>
                      </div>

                      <div className="ml-auto flex items-center gap-2">
                        {locked && m.unlock_cost > 0 ? (
                          <button onClick={() => unlock(m)} disabled={busyId === m.id || localCredits < m.unlock_cost}
                            className="btn btn-dark btn-sm h-8">
                            {busyId === m.id ? "Unlocking…" : <><Unlock size={12} /> {m.unlock_cost} credits</>}
                          </button>
                        ) : (
                          <Link href={`/learn/${m.slug}`} className={cn("btn btn-sm h-8", done ? "btn-dark" : unlocked ? "btn-primary" : "btn-dark")}>
                            {done ? "Review" : unlocked ? <><Play size={12} /> Start</> : "Open"} <ChevronRight size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.055] bg-white/[0.015] px-4 py-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5"><Sparkles size={11} className="text-[#ffd08d]" /> Every credit is earned through learning, never purchased.</span>
        <span>Curriculum aligned to SDG 4 · Quality education</span>
      </div>
    </div>
  );
}
