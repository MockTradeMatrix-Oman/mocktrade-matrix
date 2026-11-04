"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, ArrowUpRight, BarChart3, BookOpen, BrainCircuit, Flame, Gauge, ShoppingBag, Sparkles,
  Target, TrendingDown, TrendingUp, Trophy, Wallet, Zap,
} from "lucide-react";
import { Avatar, AnimatedNumber, Badge, Card, ChangePill, LivePrice, Progress, SectionHead, cn } from "./ui";
import { Sparkline } from "./charts";
import { useLivePortfolio, useMarket } from "./socket";
import { fmtMoney, fmtPct, levelFromXp, toLocal } from "@/lib/finance";

type Position = {
  symbol: string; name: string; qty: number; priceUsd: number; avgLocal: number; dayPct: number;
  value: number; cost: number; pnl: number; pnlPct: number; dayChange: number; priceLocal: number;
  class?: string; esg?: number;
};

/* ------------------------------------------------------------------ */

export function PortfolioHero({
  positions,
  cash,
  history,
  region,
  name,
  rank,
}: {
  positions: Position[];
  cash: number;
  history: Array<{ t: number; v: number }>;
  region: string;
  name: string;
  rank: { rank: number; returnPct: number } | null;
}) {
  const live = useLivePortfolio(positions, cash, region);
  const [range, setRange] = useState<"1M" | "3M" | "6M">("1M");
  const sliced = useMemo(() => {
    const n = range === "1M" ? 30 : range === "3M" ? 90 : 180;
    return history.slice(-n).map((h) => h.v);
  }, [history, range]);
  const invested = live.marketValue;
  const hasPositions = positions.length > 0;
  const series = sliced.length > 1 ? sliced : [];
  const start = history[0]?.v ?? 0;
  const periodPct = start > 0 ? ((invested - start) / start) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(47,227,160,.13), transparent 65%)" }} />
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="eyebrow">Invested portfolio value</span>
              <span className="flex items-center gap-1 rounded-full border border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.08)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#5beeb9]">
                <span className="h-1 w-1 rounded-full bg-[#2fe3a0]" /> live
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div className="num text-[34px] font-semibold leading-none tracking-tight sm:text-[42px]">
                {fmtMoney(invested, region)}
              </div>
              {hasPositions ? (
                <div className="mb-1 flex items-center gap-2">
                  <ChangePill value={live.dayPct} showIcon />
                  <span className="text-[11.5px] text-muted">
                    {live.dayChange >= 0 ? "+" : ""}{fmtMoney(live.dayChange, region)} today
                  </span>
                </div>
              ) : (
                <span className="mb-1.5 rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-muted">
                  Nothing invested yet
                </span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span>Welcome back, <span className="text-ink">{name.split(" ")[0]}</span>.</span>
              <span className="text-muted/40">·</span>
              <span>Account total {fmtMoney(live.total, region)}</span>
              {rank && (
                <span className="flex items-center gap-1 rounded-md bg-white/[0.04] px-1.5 py-0.5">
                  <Trophy size={10} className="text-[#ffd08d]" /> Rank #{rank.rank} · {fmtPct(rank.returnPct)} all time
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-1">
            {(["1M", "3M", "6M"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={cn("rounded-md px-2 py-1 text-[10px] font-semibold transition", range === r ? "bg-white/[0.09] text-ink" : "text-muted hover:text-ink")}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-end gap-4">
          <div className="flex-1">
            {series.length > 1 ? (
              <Sparkline data={series} width={620} height={78} tone="green" strokeWidth={1.9} responsive />
            ) : (
              <div className="flex h-[78px] items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.07] text-[10.5px] text-muted">
                <Wallet size={13} className="text-muted/60" />
                Your invested value curve starts with your first trade.
              </div>
            )}
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <div className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Period</div>
            <div className={cn("num mt-1 text-[15px] font-semibold", !hasPositions ? "text-muted" : periodPct >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
              {hasPositions ? fmtPct(periodPct) : "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-4">
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.12em] text-muted">Cash available</div>
            <div className="num mt-1 text-[13px] font-semibold">{fmtMoney(cash, region)}</div>
          </div>
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.12em] text-muted">Invested</div>
            <div className="num mt-1 text-[13px] font-semibold">{fmtMoney(invested, region)}</div>
          </div>
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.12em] text-muted">Unrealised P&amp;L</div>
            <div className={cn("num mt-1 text-[13px] font-semibold", live.unrealized >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
              {live.unrealized >= 0 ? "+" : ""}{fmtMoney(live.unrealized, region)}
            </div>
          </div>
          <div className="flex items-end justify-start gap-2 sm:justify-end">
            <Link href="/trade" className="btn btn-primary btn-sm">Trade now <ArrowUpRight size={13} /></Link>
            <Link href="/portfolio" className="btn btn-dark btn-sm hidden sm:inline-flex">Details</Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function CreditsCard({
  credits,
  xp,
  streak,
  nextModule,
}: {
  credits: number;
  xp: number;
  streak: number;
  nextModule: { title: string; slug: string; cost: number } | null;
}) {
  const { socket } = useMarket();
  const [liveCredits, setLiveCredits] = useState(credits);
  const [bump, setBump] = useState(false);
  const lvl = levelFromXp(xp);

  useEffect(() => {
    if (!socket) return;
    const handler = (d: any) => {
      setLiveCredits(d.credits);
      setBump(true);
      setTimeout(() => setBump(false), 900);
    };
    socket.on("credits:update", handler);
    return () => {
      socket.off("credits:update", handler);
    };
  }, [socket]);
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,192,97,.12), transparent 65%)" }} />
      <div className="relative flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Learning currency</div>
            <div className={cn("num mt-1.5 flex items-baseline gap-1.5 text-[30px] font-semibold leading-none text-[#ffd08d] transition-transform", bump && "scale-105")}>
              <Zap size={20} className="mb-1" /> {liveCredits}
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.07)] px-2.5 py-1 text-[10px] font-semibold text-[#ffd08d]">
            <Flame size={11} /> {streak}d streak
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-3">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-muted">Level {lvl.level}</span>
            <span className="num text-muted">{xp} / {lvl.ceil} XP</span>
          </div>
          <Progress value={lvl.progress * 100} tone="amber" className="mt-2" />
          <div className="mt-2 text-[10px] text-muted">Earn credits through quizzes or trading performance — both feed the same ladder.</div>
        </div>

        {nextModule ? (
          <div className="mt-3 flex-1">
            <div className="text-[9.5px] uppercase tracking-[0.12em] text-muted">Next unlock</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-[12px] font-medium">{nextModule.title}</div>
              <span className="chip chip-amber shrink-0">{nextModule.cost} cr</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex-1 text-[11px] text-muted">Ladder complete. Revisit any module to sharpen the basics.</div>
        )}

        <Link href="/learn" className="btn btn-ghost mt-3 w-full">
          <BookOpen size={14} /> Open learning ladder
        </Link>
        <Link href="/shop" className="btn btn-dark mt-1.5 w-full">
          <ShoppingBag size={14} /> Spend credits in the shop
        </Link>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function MarketPulse({ meta, region }: { meta: Array<{ symbol: string; name: string; class: string }>; region: string }) {
  const { prices } = useMarket();
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const rows = useMemo(() => {
    const list = Object.values(prices).filter((p) => p.c === "stock" || p.c === "crypto");
    const sorted = [...list].sort((a, b) => tab === "gainers" ? b.chg - a.chg : a.chg - b.chg);
    return sorted.slice(0, 5);
  }, [prices, tab]);
  const all = Object.values(prices).filter((p) => p.c === "stock" || p.c === "crypto");
  const advancers = all.filter((p) => p.chg > 0).length;
  const decliners = all.filter((p) => p.chg < 0).length;
  const names = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of meta) m[a.symbol] = a.name;
    return m;
  }, [meta]);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.05] p-4">
        <SectionHead title="Market pulse" subtitle={`${advancers} advancing · ${decliners} declining`} />
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-0.5">
          <button onClick={() => setTab("gainers")} className={cn("rounded-md px-2 py-1 text-[10px] font-semibold", tab === "gainers" ? "bg-[rgba(47,227,160,.12)] text-[#5beeb9]" : "text-muted")}>Gainers</button>
          <button onClick={() => setTab("losers")} className={cn("rounded-md px-2 py-1 text-[10px] font-semibold", tab === "losers" ? "bg-[rgba(255,93,122,.12)] text-[#ff8fa3]" : "text-muted")}>Losers</button>
        </div>
      </div>
      <div className="flex-1 divide-y divide-white/[0.04]">
        {rows.map((r) => (
          <Link key={r.s} href={`/markets/${r.s}`} className="table-row flex items-center gap-3 px-4 py-2.5">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[9px] font-bold",
              r.chg >= 0 ? "border-[rgba(47,227,160,.18)] bg-[rgba(47,227,160,.07)] text-[#5beeb9]" : "border-[rgba(255,93,122,.18)] bg-[rgba(255,93,122,.07)] text-[#ff8fa3]")}>
              {r.s.slice(0, 3)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11.5px] font-semibold">{r.s}</div>
              <div className="truncate text-[9.5px] text-muted">{names[r.s] ?? "Instrument"}</div>
            </div>
            <div className="text-right">
              <div className="num text-[11.5px] font-medium">{fmtMoney(toLocal(r.p, region), region, true)}</div>
              <ChangePill value={r.chg} className="mt-0.5" />
            </div>
          </Link>
        ))}
        {rows.length === 0 && <div className="p-6 text-center text-[11px] text-muted">Waiting for the tape…</div>}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function HoldingsMini({ positions, cash, region }: { positions: Position[]; cash: number; region: string }) {
  const live = useLivePortfolio(positions, cash, region);
  const rows = live.positions.slice(0, 4);
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.05] p-4">
        <SectionHead title="Your positions" subtitle={`${positions.length} instruments · live valuation`} />
        <Link href="/portfolio" className="-my-2 shrink-0 py-2 text-[10.5px] font-semibold text-[#5beeb9] hover:underline">View all</Link>
      </div>
      <div className="flex-1 divide-y divide-white/[0.04]">
        {rows.map((p) => (
          <Link key={p.symbol} href={`/markets/${p.symbol}`} className="table-row flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11.5px] font-semibold">{p.symbol}</span>
                <span className="rounded bg-white/[0.05] px-1 py-0.5 text-[8.5px] uppercase tracking-wide text-muted">{p.class ?? "stock"}</span>
              </div>
              <div className="mt-0.5 text-[9.5px] text-muted">{p.qty.toLocaleString("en-US", { maximumFractionDigits: 4 })} units · avg {fmtMoney(p.avgLocal, region)}</div>
            </div>
            <div className="text-right">
              <div className="num text-[11.5px] font-medium">{fmtMoney(p.value, region)}</div>
              <div className={cn("num mt-0.5 text-[9.5px] font-semibold", p.pnl >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>{fmtPct(p.pnlPct)}</div>
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
            <Wallet size={20} className="text-muted/60" />
            <div className="mt-2 text-[11.5px] font-medium">No positions yet</div>
            <Link href="/markets" className="btn btn-primary btn-sm mt-3">Explore markets</Link>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-3">
        <span className="text-[10px] text-muted">Total market value</span>
        <span className="num text-[12.5px] font-semibold">{fmtMoney(live.marketValue, region)}</span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function AiSignalCard({
  prediction,
  accuracy,
  recent,
  region,
}: {
  prediction: { symbol: string; name: string; direction: string; confidence: number; target_price: number; start_price: number } | null;
  accuracy: number;
  recent: Array<{ id: number; correct: number | null; symbol: string }>;
  region: string;
}) {
  const { prices } = useMarket();
  const [expanded, setExpanded] = useState(false);
  if (!prediction) {
    return (
      <Card className="flex h-full flex-col items-center justify-center p-6 text-center">
        <BrainCircuit size={24} className="text-[#b3a8ff]/60" />
        <div className="mt-3 text-[12px] font-semibold">Trend engine warming up</div>
        <div className="mt-1 text-[10.5px] text-muted">New forecasts publish every 45 seconds.</div>
      </Card>
    );
  }
  const livePrice = prices[prediction.symbol]?.p ?? prediction.start_price;
  const up = prediction.direction === "bullish";
  const targetLocal = toLocal(prediction.target_price, region);
  const targetPct = ((prediction.target_price - livePrice) / livePrice) * 100;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,123,255,.16), transparent 65%)" }} />
      <div className="relative flex items-center justify-between border-b border-white/[0.05] p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[rgba(139,123,255,.22)] bg-[rgba(139,123,255,.1)] text-[#b3a8ff]">
            <BrainCircuit size={14} />
          </div>
          <div>
            <div className="text-[11.5px] font-semibold">AI trend signal</div>
            <div className="text-[9px] uppercase tracking-[0.1em] text-muted">LSTM ensemble · 1D horizon</div>
          </div>
        </div>
        <Badge tone={accuracy > 0 ? "violet" : "neutral"}>{accuracy > 0 ? `${accuracy.toFixed(1)}% acc` : "building record"}</Badge>
      </div>

      <div className="flex-1 p-4">
        <div className="flex items-start justify-between">
          <div>
            <Link href={`/markets/${prediction.symbol}`} className="text-[15px] font-semibold hover:text-[#5beeb9]">{prediction.symbol}</Link>
            <div className="mt-0.5 text-[10px] text-muted">{prediction.name}</div>
          </div>
          <span className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide",
            up ? "bg-[rgba(47,227,160,.1)] text-[#5beeb9]" : "bg-[rgba(255,93,122,.1)] text-[#ff8fa3]")}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {prediction.direction}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted">Confidence</span>
            <span className="num font-semibold text-[#b3a8ff]">{(prediction.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#6f5cff] to-[#b3a8ff]" style={{ width: `${prediction.confidence * 100}%` }} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
            <div className="text-[9px] uppercase tracking-wide text-muted">Live</div>
            <div className="num mt-1 text-[12px] font-semibold">{fmtMoney(toLocal(livePrice, region), region)}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
            <div className="text-[9px] uppercase tracking-wide text-muted">Target</div>
            <div className={cn("num mt-1 text-[12px] font-semibold", targetPct >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>{fmtMoney(targetLocal, region)}</div>
          </div>
        </div>

        <button onClick={() => setExpanded((v) => !v)} className="mt-3 flex min-h-8 w-full items-center justify-between py-1 text-[10px] text-muted hover:text-ink">
          <span>Model track record</span>
          <span className="flex items-center gap-1">
            <span className="flex gap-0.5">
              {recent.slice(0, 8).map((r) => (
                <span key={r.id} className={cn("h-1.5 w-1.5 rounded-full", r.correct ? "bg-[#2fe3a0]" : "bg-[#ff5d7a]/60")} />
              ))}
            </span>
            <ArrowRight size={10} className={cn("transition-transform", expanded && "rotate-90")} />
          </span>
        </button>
        {expanded && (
          <div className="mt-2 space-y-1.5 rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
            {recent.length === 0 && <div className="text-[10px] text-muted">No resolved forecasts yet.</div>}
            {recent.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-[10px]">
                <span className="text-muted">{r.symbol}</span>
                <span className={r.correct ? "text-[#5beeb9]" : "text-[#ff8fa3]"}>{r.correct ? "correct" : "missed"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function LadderPreview({
  modules,
}: {
  modules: Array<{ id: number; slug: string; title: string; level: string; status: string; reward_credits: number; minutes: number; order_index: number }>;
}) {
  const current = modules.find((m) => m.status === "unlocked") ?? modules.find((m) => m.status !== "completed");
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.05] p-4">
        <SectionHead title="Learning ladder" subtitle="Two paths in. One destination." />
        <Link href="/learn" className="-my-2 shrink-0 py-2 text-[10.5px] font-semibold text-[#5beeb9] hover:underline">Full ladder</Link>
      </div>
      <div className="flex-1 p-4">
        <div className="relative space-y-1">
          <div className="absolute bottom-3 left-[15px] top-3 w-px bg-white/[0.07]" />
          {modules.slice(0, 4).map((m) => {
            const done = m.status === "completed";
            const unlocked = m.status === "unlocked";
            return (
              <div key={m.id} className="relative flex items-center gap-3 rounded-lg py-1.5">
                <div className={cn("z-10 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                  done ? "border-[rgba(47,227,160,.4)] bg-[rgba(47,227,160,.14)] text-[#5beeb9]"
                    : unlocked ? "border-[rgba(255,192,97,.4)] bg-[rgba(255,192,97,.12)] text-[#ffd08d]"
                    : "border-white/[0.08] bg-[#0b0f17] text-muted/60")}>
                  {done ? "✓" : m.order_index}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-[11.5px] font-medium", m.status === "locked" && "text-muted/70")}>{m.title}</div>
                  <div className="mt-0.5 text-[9.5px] text-muted">{m.level} · {m.minutes} min · {m.reward_credits} cr</div>
                </div>
                {unlocked && <Link href={`/learn/${m.slug}`} className="btn btn-primary btn-sm shrink-0">Start</Link>}
                {done && <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-[#5beeb9]/70">Done</span>}
                {m.status === "locked" && <span className="shrink-0 text-[9px] text-muted/50">Locked</span>}
              </div>
            );
          })}
        </div>
        {current && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[rgba(255,192,97,.15)] bg-[rgba(255,192,97,.05)] px-3 py-2">
            <Target size={13} className="text-[#ffd08d]" />
            <span className="text-[10px] text-[#e6cfa6]">Next up: {current.title}</span>
            <Link href={`/learn/${current.slug}`} className="ml-auto -my-2 flex min-h-8 min-w-8 shrink-0 items-center justify-end px-1 text-[10px] font-semibold text-[#ffd08d] hover:underline">Open</Link>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function ActivityFeed({ items }: { items: Array<{ id: number; type: string; text: string; created_at: number; name: string; avatar: string }> }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="border-b border-white/[0.05] p-4">
        <SectionHead title="Campus activity" subtitle="What other learners are doing" />
      </div>
      <div className="flex-1 space-y-0 divide-y divide-white/[0.04]">
        {items.map((a) => (
          <div key={a.id} className="flex gap-2.5 px-4 py-3">
            <Avatar name={a.name} size={28} />
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] leading-relaxed text-[#b9c2d2]">{a.text}</div>
              <div className="mt-1 text-[9px] text-muted/60">{new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="p-6 text-center text-[11px] text-muted">Quiet on campus.</div>}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function LeaderboardCard({
  rows,
  meId,
  region,
}: {
  rows: Array<{ id: number; name: string; avatar: string; returnPct: number; rank: number; region: string }>;
  meId: number;
  region: string;
}) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.05] p-4">
        <SectionHead title="Leaderboard" subtitle="Ranked by portfolio return" />
        <Trophy size={15} className="text-[#ffd08d]" />
      </div>
      <div className="flex-1 divide-y divide-white/[0.04]">
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <Trophy size={18} className="text-muted/40" />
            <div className="text-[11px] font-medium">No ranked learners yet</div>
            <div className="max-w-[220px] text-[10px] leading-relaxed text-muted">
              The board fills in as real accounts join and start trading.
            </div>
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className={cn("flex items-center gap-2.5 px-4 py-2.5", r.id === meId && "bg-[rgba(47,227,160,.04)]")}>
            <span className={cn("num w-5 text-center text-[10px] font-bold", r.rank === 1 ? "text-[#ffd08d]" : r.rank === 2 ? "text-[#c9d2e2]" : r.rank === 3 ? "text-[#d9a066]" : "text-muted")}>{r.rank}</span>
            <Avatar name={r.name} size={24} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10.5px] font-medium">{r.name} {r.id === meId && <span className="text-[8px] text-[#5beeb9]">(you)</span>}</div>
              <div className="text-[8.5px] text-muted">{r.region === "IN" ? "India" : "United States"}</div>
            </div>
            <span className={cn("num text-[10px] font-semibold", r.returnPct >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>{fmtPct(r.returnPct, 1)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function CrashTrainingBanner({ done }: { done: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[rgba(255,93,122,.16)] bg-[rgba(255,93,122,.05)] px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,93,122,.2)] bg-[rgba(255,93,122,.08)] text-[#ff8fa3]">
        <Gauge size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-semibold">{done ? "Crash drill completed" : "Crash drill scheduled"}</div>
        <div className="mt-0.5 text-[10.5px] text-muted">
          {done
            ? "You have survived a simulated 50% drawdown. The next drill lands at a random date — that is the point."
            : "Drills hit without warning, roughly every 2 days to 2 weeks. A simulated 50% drawdown — no real capital at risk."}
        </div>
      </div>
      <span className={cn("chip shrink-0", done ? "chip-green" : "chip-amber")}>{done ? "Trained" : "Scheduled"}</span>
    </div>
  );
}
