"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight, Coins, Crown, Flame, Globe2, Medal, Swords, Target, TrendingUp, Trophy, Zap,
} from "lucide-react";
import { Avatar, Badge, Card, Progress, SectionHead, cn } from "./ui";
import { fmtMoney } from "@/lib/finance";
import { ARENA_REGION_GROUPS, arenaRegionLabel } from "@/lib/regions";

type ArenaRow = {
  id: number;
  name: string;
  avatar: string;
  arena_region: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  correct: number;
  answered: number;
  credits_won: number;
  rating: number;
  winPct: number;
  accuracy: number;
  rank?: number;
};

type PortfolioRow = {
  id: number;
  name: string;
  avatar: string;
  mode: string;
  region: string;
  credits: number;
  xp: number;
  streak: number;
  total: number;
  returnPct: number;
  rank?: number;
};

type MarketRegion = "IN" | "US";

export function Leaderboard({
  user,
  arena,
  portfolio,
}: {
  user: { id: number; name: string; arenaRegion: string };
  arena: Record<string, ArenaRow[]>;
  portfolio: Record<MarketRegion, PortfolioRow[]>;
}) {
  const [board, setBoard] = useState<"arena" | "portfolio">("arena");
  const [arenaRegion, setArenaRegion] = useState(user.arenaRegion || "IN");
  const [marketRegion, setMarketRegion] = useState<MarketRegion>("IN");

  const arenaRows = arena[arenaRegion] ?? [];
  const portfolioRows = portfolio[marketRegion] ?? [];
  const mine = board === "arena"
    ? arenaRows.find((r) => r.id === user.id)
    : portfolioRows.find((r) => r.id === user.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffd08d]">
            <Trophy size={11} /> Leaderboard
          </div>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight sm:text-[28px]">Global battles, regional ladders</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
            Live matchmaking is skill-based and open to every region, so your opponent can be anywhere. The quiz
            ladder is then sliced by each learner&apos;s own region. Portfolio returns are grouped by market
            currency. Only real learner accounts appear here.
          </p>
        </div>
        <Link href="/arena" className="btn btn-primary btn-sm">
          <Swords size={13} /> Enter the arena <ArrowRight size={13} />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.025] p-0.5">
          {(["arena", "portfolio"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setBoard(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                board === key ? "bg-white/[0.07] text-ink shadow-sm" : "text-muted hover:text-ink"
              )}
            >
              {key === "arena" ? <Swords size={12} /> : <TrendingUp size={12} />}
              {key === "arena" ? "Quiz ladder" : "Portfolio returns"}
            </button>
          ))}
        </div>

        {board === "arena" ? (
          <label className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5">
            <Globe2 size={12} className="text-muted" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">Region</span>
            <select
              value={arenaRegion}
              onChange={(e) => setArenaRegion(e.target.value)}
              className="max-w-[190px] bg-transparent text-[11px] font-semibold text-ink outline-none"
            >
              {ARENA_REGION_GROUPS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.regions.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#0b0f16]">
                      {r.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        ) : (
          <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.025] p-0.5">
            {(["IN", "US"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setMarketRegion(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                  marketRegion === key ? "bg-white/[0.07] text-ink shadow-sm" : "text-muted hover:text-ink"
                )}
              >
                <Globe2 size={12} />
                {key === "IN" ? "India" : "United States"}
              </button>
            ))}
          </div>
        )}

        {mine?.rank && (
          <Badge tone="green">
            You are #{mine.rank} in{" "}
            {board === "arena" ? arenaRegionLabel(arenaRegion) : marketRegion === "IN" ? "India" : "United States"}
          </Badge>
        )}
      </div>

      {board === "arena" ? (
        <div className="grid gap-4 xl:grid-cols-[1.6fr_.4fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
              <SectionHead
                title={`${arenaRegionLabel(arenaRegion)} quiz ladder`}
                subtitle="Ranked by skill rating from global live 1v1 battles"
              />
            </div>
            {arenaRows.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-muted">
                  <Swords size={18} />
                </div>
                <div className="mt-3 text-[13px] font-semibold">No rated battles in this region yet</div>
                <p className="mx-auto mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-muted">
                  The first finished match from a learner who picked {arenaRegionLabel(arenaRegion)} puts a name
                  on this board. Matchmaking is global, so your next opponent can be from anywhere.
                </p>
                <Link href="/arena" className="btn btn-primary btn-sm mt-4">Find an opponent</Link>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {arenaRows.map((row, i) => {
                  const rank = row.rank ?? i + 1;
                  const isMe = row.id === user.id;
                  return (
                    <li
                      key={row.id}
                      className={cn("flex items-center gap-3 px-4 py-3 sm:px-5", isMe && "bg-[rgba(47,227,160,.045)]")}
                    >
                      <span className={cn(
                        "num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10.5px] font-bold",
                        rank === 1 ? "border-[rgba(255,192,97,.35)] bg-[rgba(255,192,97,.1)] text-[#ffd08d]"
                          : rank === 2 ? "border-[rgba(201,210,226,.25)] bg-white/[0.05] text-[#c9d2e2]"
                          : rank === 3 ? "border-[rgba(214,148,96,.28)] bg-[rgba(214,148,96,.08)] text-[#e0b48a]"
                          : "border-white/[0.07] bg-white/[0.02] text-muted"
                      )}>
                        {rank === 1 ? <Crown size={12} /> : rank}
                      </span>
                      <Avatar name={row.name} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12px] font-semibold">{row.name}</span>
                          {isMe && <span className="rounded bg-[rgba(47,227,160,.14)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#8df5d0]">You</span>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] text-muted">
                          <span className="num">{row.wins}W · {row.losses}L{row.draws ? ` · ${row.draws}D` : ""}</span>
                          <span className="text-muted/40">·</span>
                          <span className="num">{row.accuracy}% accuracy</span>
                          <span className="text-muted/40">·</span>
                          <span className="num">{row.matches} played</span>
                        </div>
                      </div>
                      <div className="hidden w-24 sm:block">
                        <Progress value={row.winPct} tone="green" />
                        <div className="mt-1 text-right text-[8.5px] text-muted">{row.winPct}% win rate</div>
                      </div>
                      <div className="w-16 text-right">
                        <div className="num text-[13px] font-semibold text-[#8df5d0]">{row.rating}</div>
                        <div className="flex items-center justify-end gap-0.5 text-[8.5px] text-muted"><Target size={8} /> rating</div>
                        <div className="mt-0.5 flex items-center justify-end gap-0.5 text-[8px] text-[#ffd08d]"><Zap size={8} /> {row.credits_won}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                <Target size={12} className="text-[#5beeb9]" /> How the ladder scores
              </div>
              <ul className="mt-3 space-y-2.5 text-[10.5px] leading-relaxed text-muted">
                <li className="flex gap-2"><span className="text-[#5beeb9]">1</span> Every learner starts at 1000 rating.</li>
                <li className="flex gap-2"><span className="text-[#5beeb9]">2</span> Beating a stronger opponent moves you further; losing to a weaker one costs more.</li>
                <li className="flex gap-2"><span className="text-[#5beeb9]">3</span> Matchmaking pairs the closest ratings available, widening the search as you wait.</li>
                <li className="flex gap-2"><span className="text-[#5beeb9]">4</span> This ladder only shows learners who picked the same region.</li>
              </ul>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                <Coins size={12} className="text-[#ffd08d]" /> Spend what you win
              </div>
              <p className="mt-2.5 text-[10.5px] leading-relaxed text-muted">
                Wins still pay 10 credits per correct answer, capped at 60. Credits buy simulated capital and
                quiz powerups in the shop.
              </p>
              <Link href="/shop" className="btn btn-ghost btn-sm mt-3 w-full">Open the shop <ArrowRight size={12} /></Link>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.6fr_.4fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
              <SectionHead
                title={`${marketRegion === "IN" ? "India" : "United States"} portfolio board`}
                subtitle="Ranked by simulated return on starting capital"
              />
            </div>
            {portfolioRows.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-muted">
                  <TrendingUp size={18} />
                </div>
                <div className="mt-3 text-[13px] font-semibold">No portfolios in this market yet</div>
                <p className="mx-auto mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-muted">
                  Place a first trade and your return will show up here.
                </p>
                <Link href="/trade" className="btn btn-primary btn-sm mt-4">Open the terminal</Link>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {portfolioRows.map((row, i) => {
                  const rank = row.rank ?? i + 1;
                  const isMe = row.id === user.id;
                  return (
                    <li key={row.id} className={cn("flex items-center gap-3 px-4 py-3 sm:px-5", isMe && "bg-[rgba(47,227,160,.045)]")}>
                      <span className={cn(
                        "num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10.5px] font-bold",
                        rank === 1 ? "border-[rgba(255,192,97,.35)] bg-[rgba(255,192,97,.1)] text-[#ffd08d]"
                          : rank === 2 ? "border-[rgba(201,210,226,.25)] bg-white/[0.05] text-[#c9d2e2]"
                          : rank === 3 ? "border-[rgba(214,148,96,.28)] bg-[rgba(214,148,96,.08)] text-[#e0b48a]"
                          : "border-white/[0.07] bg-white/[0.02] text-muted"
                      )}>
                        {rank === 1 ? <Crown size={12} /> : rank}
                      </span>
                      <Avatar name={row.name} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12px] font-semibold">{row.name}</span>
                          {isMe && <span className="rounded bg-[rgba(47,227,160,.14)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#8df5d0]">You</span>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] text-muted">
                          <span className="num">{fmtMoney(row.total, marketRegion)} book value</span>
                          <span className="text-muted/40">·</span>
                          <span className="flex items-center gap-0.5"><Flame size={8} /> {row.streak}d streak</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("num text-[12px] font-semibold", row.returnPct >= 0 ? "text-[#8df5d0]" : "text-[#ff8fa3]")}>
                          {row.returnPct >= 0 ? "+" : ""}{row.returnPct.toFixed(2)}%
                        </div>
                        <div className="text-[8.5px] text-muted">return</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                <Medal size={12} className="text-[#ffd08d]" /> How returns work
              </div>
              <ul className="mt-3 space-y-2.5 text-[10.5px] leading-relaxed text-muted">
                <li className="flex gap-2"><span className="text-[#5beeb9]">·</span> Return is measured against your starting capital.</li>
                <li className="flex gap-2"><span className="text-[#5beeb9]">·</span> Cash plus live holdings value, marked to the tape.</li>
                <li className="flex gap-2"><span className="text-[#5beeb9]">·</span> Currency is normalised per market before ranking.</li>
              </ul>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                <Swords size={12} className="text-[#b3a8ff]" /> Want faster credits?
              </div>
              <p className="mt-2.5 text-[10.5px] leading-relaxed text-muted">
                The quiz ladder pays credits directly. Win a battle, then buy capital in the shop.
              </p>
              <Link href="/arena" className="btn btn-ghost btn-sm mt-3 w-full">Enter the arena <ArrowRight size={12} /></Link>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
