"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Crown, Flame, Info, Medal, ShieldCheck, Sparkles, Timer, Trophy, TrendingDown, Zap } from "lucide-react";
import { Avatar, Badge, Card, Progress, SectionHead, cn } from "./ui";

type Member = { userId: number; name: string; avatar: string; xp: number; joinedAt: number };

export type LeagueData = {
  tier: string;
  tierLabel: string;
  weekKey: string;
  cohort: number;
  cohortSize: number;
  endsAt: number;
  members: Member[];
  myRank: number | null;
  myXp: number;
  promoteCount: number;
  demoteCount: number;
  nextTier: string;
  nextTierLabel: string;
};

const TIERS = ["bronze", "silver", "gold", "diamond"];

const TIER_TONE: Record<string, { color: string; border: string; bg: string }> = {
  bronze: { color: "#e0b07a", border: "rgba(224,176,122,.3)", bg: "rgba(224,176,122,.08)" },
  silver: { color: "#cfd8e6", border: "rgba(207,216,230,.28)", bg: "rgba(207,216,230,.07)" },
  gold: { color: "#ffd08d", border: "rgba(255,192,97,.3)", bg: "rgba(255,192,97,.08)" },
  diamond: { color: "#7fdcff", border: "rgba(76,201,240,.3)", bg: "rgba(76,201,240,.08)" },
};

function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function LeagueView({ league }: { league: LeagueData }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const tone = TIER_TONE[league.tier] ?? TIER_TONE.bronze;

  useEffect(() => {
    const tick = () => setRemaining(league.endsAt - Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [league.endsAt]);

  const bottomStart = Math.max(league.promoteCount, league.members.length - league.demoteCount);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="relative p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
            style={{ background: `radial-gradient(circle, ${tone.bg}, transparent 65%)` }}
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
                style={{ borderColor: tone.border, background: tone.bg, color: tone.color }}
              >
                <Medal size={26} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="violet"><Trophy size={9} /> Weekly XP league</Badge>
                  <Badge tone="neutral">Cohort {league.cohort + 1}</Badge>
                  <Badge tone="green"><ShieldCheck size={9} /> Real learners only</Badge>
                </div>
                <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
                  {league.tierLabel} league
                </h1>
                <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-muted">
                  Week of {league.weekKey}. Weekly XP is counted from the moment you joined the cohort,
                  so nobody starts with a hidden head start.
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="eyebrow">Week ends in</div>
              <div className="num mt-1 flex items-center justify-end gap-1.5 text-[20px] font-semibold text-[#7fdcff]">
                <Timer size={16} /> {remaining === null ? "—" : countdown(remaining)}
              </div>
              <div className="mt-1 text-[10px] text-muted">Monday 00:00 UTC</div>
            </div>
          </div>

          <div className="relative mt-5 grid gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <div className="eyebrow">Your rank</div>
              <div className="num mt-1 text-[21px] font-semibold" style={{ color: tone.color }}>
                {league.myRank === null ? "—" : `#${league.myRank}`}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <div className="eyebrow">Weekly XP</div>
              <div className="num mt-1 flex items-center gap-1 text-[21px] font-semibold text-[#ffd08d]">
                <Zap size={15} /> {league.myXp}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <div className="eyebrow">Cohort</div>
              <div className="num mt-1 text-[21px] font-semibold">{league.cohortSize}/20</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <div className="eyebrow">Next tier</div>
              <div className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: TIER_TONE[league.nextTier]?.color ?? "#cfd8e6" }}>
                {league.tier === "diamond" ? <Crown size={14} /> : <ArrowUpRight size={14} />}
                {league.tier === "diamond" ? "Top tier" : league.nextTierLabel}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] p-4">
            <SectionHead title="This week's cohort" subtitle="Top 5 promote, bottom 5 demote when the week closes." />
            <span className="chip chip-green"><Flame size={9} /> {league.members.length} learners</span>
          </div>
          {league.members.length === 0 ? (
            <div className="p-8 text-center text-[11.5px] text-muted">No cohort members yet.</div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {league.members.map((member, index) => {
                const me = league.myRank === index + 1;
                const zone =
                  index < league.promoteCount
                    ? "promote"
                    : league.demoteCount > 0 && index >= bottomStart
                      ? "demote"
                      : "hold";
                return (
                  <div
                    key={member.userId}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5",
                      me && "bg-[rgba(139,123,255,.06)]"
                    )}
                  >
                    <span
                      className={cn(
                        "num flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold",
                        zone === "promote"
                          ? "bg-[rgba(47,227,160,.12)] text-[#5beeb9]"
                          : zone === "demote"
                            ? "bg-[rgba(255,93,122,.12)] text-[#ff8fa3]"
                            : "bg-white/[0.04] text-muted"
                      )}
                    >
                      {index + 1}
                    </span>
                    <Avatar name={member.name} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">
                        {member.name} {me && <span className="text-[9px] font-semibold uppercase tracking-wider text-[#b3a8ff]">you</span>}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-muted">
                        {zone === "promote" ? "Promotion zone" : zone === "demote" ? "Demotion zone" : "Safe"}
                      </div>
                    </div>
                    <span className="num flex items-center gap-1 text-[12px] font-semibold text-[#ffd08d]">
                      <Zap size={11} /> {member.xp}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHead title="Tier ladder" subtitle="Promotion and demotion resolve once." />
            <div className="mt-3 space-y-2">
              {TIERS.map((tier, index) => {
                const style = TIER_TONE[tier];
                const current = tier === league.tier;
                return (
                  <div
                    key={tier}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3 py-2",
                      current ? "border-white/[0.14] bg-white/[0.04]" : "border-white/[0.05] bg-black/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted">{index + 1}</span>
                      <span className="text-[11.5px] font-semibold capitalize" style={{ color: style.color }}>
                        {tier}
                      </span>
                    </div>
                    {current ? (
                      <Badge tone="violet"><Sparkles size={9} /> You</Badge>
                    ) : (
                      <span className="text-[9px] text-muted">
                        {index < TIERS.indexOf(league.tier) ? "Below" : "Above"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted">
              Diamond is the top tier. Bronze never demotes; Diamond never promotes.
            </p>
          </Card>

          <Card className="p-5">
            <SectionHead title="How XP counts" subtitle="Only real learning moves the ladder." />
            <div className="mt-3 space-y-2.5">
              {[
                "Module quizzes, Lightning Rounds and boss clears add XP.",
                "Sandbox trades add a small amount of XP.",
                "Daily quest claims add the XP shown on each quest.",
                "No bots, no filler names, no invented scores.",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#c9d2e2]">
                  <Info size={11} className="mt-0.5 shrink-0 text-[#7fdcff]" /> {line}
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <TrendingDown size={13} className="text-[#ff8fa3]" />
              Bottom {league.demoteCount || 0} move down.
            </div>
            <Link href="/learn" className="btn btn-dark btn-sm">
              Earn XP <ArrowRight size={12} />
            </Link>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-[10.5px] text-muted">
              <ShieldCheck size={12} className="text-[#5beeb9]" />
              Weekly XP is snapshotted when you join. Late joins are not penalised.
            </div>
            <Progress value={league.cohortSize / 20 * 100} tone="violet" className="mt-2.5" />
            <div className="mt-1.5 text-[9.5px] text-muted">Cohorts cap at 20 learners per tier.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
