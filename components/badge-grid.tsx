"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award, BookOpen, Check, Coins, Flame, GraduationCap, ListChecks, Medal, ShieldAlert,
  Skull, Swords, Target, Users, Zap,
} from "lucide-react";
import { Badge, Card, Progress, SectionHead, cn } from "./ui";
import { useCelebration } from "./celebrate";

export type BadgeItem = {
  key: string;
  title: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "violet";
  target: number;
  earned: boolean;
  earnedAt: number | null;
  progress: number;
};

const ICONS: Record<string, typeof Award> = {
  "first-trade": Coins,
  "ten-trades": Coins,
  "first-lesson": BookOpen,
  curriculum: GraduationCap,
  "quiz-ace": Target,
  "streak-7": Flame,
  "streak-30": Flame,
  "crash-survivor": ShieldAlert,
  "arena-win": Swords,
  "lightning-ace": Zap,
  "boss-slayer": Skull,
  certified: Award,
  "quest-keeper": ListChecks,
  friendly: Users,
};

const TIER: Record<string, { color: string; border: string; bg: string; label: string }> = {
  bronze: { color: "#e0b07a", border: "rgba(224,176,122,.28)", bg: "rgba(224,176,122,.07)", label: "Bronze" },
  silver: { color: "#cfd8e6", border: "rgba(207,216,230,.24)", bg: "rgba(207,216,230,.06)", label: "Silver" },
  gold: { color: "#ffd08d", border: "rgba(255,192,97,.3)", bg: "rgba(255,192,97,.08)", label: "Gold" },
  violet: { color: "#b3a8ff", border: "rgba(139,123,255,.3)", bg: "rgba(139,123,255,.08)", label: "Special" },
};

export function BadgeGrid({ badges, newKeys }: { badges: BadgeItem[]; newKeys: string[] }) {
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");
  const { celebrate } = useCelebration();
  const earned = badges.filter((b) => b.earned);

  useEffect(() => {
    if (newKeys.length === 0) return;
    const first = badges.find((b) => b.key === newKeys[0]);
    celebrate({
      tone: "violet",
      title: newKeys.length === 1 ? "Badge unlocked" : `${newKeys.length} badges unlocked`,
      body: first ? first.title : undefined,
    });
    // Only the server-provided backfill should trigger this once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(
    () =>
      badges.filter((badge) =>
        filter === "all" ? true : filter === "earned" ? badge.earned : !badge.earned
      ),
    [badges, filter]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Earned</span>
            <Medal size={13} className="text-[#ffd08d]" />
          </div>
          <div className="num mt-2 text-[24px] font-semibold leading-none text-[#ffd08d]">
            {earned.length}<span className="text-[13px] text-muted">/{badges.length}</span>
          </div>
          <div className="mt-1 text-[10.5px] text-muted">Computed from real activity</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Closest</span>
            <Target size={13} className="text-[#7fdcff]" />
          </div>
          <div className="mt-2 text-[14px] font-semibold">
            {badges
              .filter((b) => !b.earned)
              .sort((a, b) => b.progress / b.target - a.progress / a.target)[0]?.title ?? "All earned"}
          </div>
          <div className="mt-1 text-[10.5px] text-muted">Keep going — no badge expires</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Collection</span>
            <Award size={13} className="text-[#b3a8ff]" />
          </div>
          <Progress value={(earned.length / Math.max(1, badges.length)) * 100} tone="violet" className="mt-4" />
          <div className="mt-2 text-[10.5px] text-muted">
            {Math.round((earned.length / Math.max(1, badges.length)) * 100)}% of the cabinet
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] p-4">
          <SectionHead title="Badge cabinet" subtitle="Every badge maps to something you actually did." />
          <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-1">
            {(["all", "earned", "locked"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[10.5px] font-semibold capitalize transition",
                  filter === value ? "bg-white/[0.09] text-ink" : "text-muted hover:text-ink"
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((badge) => {
            const Icon = ICONS[badge.key] ?? Medal;
            const tone = TIER[badge.tier];
            return (
              <div
                key={badge.key}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-4",
                  badge.earned ? "bg-white/[0.025]" : "bg-black/20 opacity-80"
                )}
                style={{ borderColor: badge.earned ? tone.border : "rgba(255,255,255,.06)" }}
              >
                {badge.earned && (
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full"
                    style={{ background: `radial-gradient(circle, ${tone.bg}, transparent 70%)` }}
                  />
                )}
                <div className="relative flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                    style={{
                      borderColor: badge.earned ? tone.border : "rgba(255,255,255,.08)",
                      background: badge.earned ? tone.bg : "rgba(255,255,255,.02)",
                      color: badge.earned ? tone.color : "#6b7689",
                    }}
                  >
                    <Icon size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="text-[12.5px] font-semibold leading-tight">{badge.title}</div>
                      {badge.earned && <Check size={12} className="text-[#5beeb9]" />}
                    </div>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{badge.description}</p>
                  </div>
                </div>
                <div className="relative mt-3">
                  {badge.earned ? (
                    <div className="flex items-center justify-between">
                      <Badge tone={badge.tier === "violet" ? "violet" : badge.tier === "gold" ? "amber" : badge.tier === "silver" ? "neutral" : "amber"}>
                        {tone.label}
                      </Badge>
                      <span className="text-[9px] text-muted">
                        {badge.earnedAt
                          ? new Date(badge.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "Earned"}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Progress value={(badge.progress / badge.target) * 100} tone="violet" />
                      <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted">
                        <span>{tone.label}</span>
                        <span className="num">{badge.progress}/{badge.target}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
