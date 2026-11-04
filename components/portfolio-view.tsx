"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, Bitcoin, CandlestickChart, ChevronRight, Coins, Download, Droplets,
  FileText, Info, Layers, PiggyBank, Receipt, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import { Badge, Card, ChangePill, EmptyState, SectionHead, cn } from "./ui";
import { Donut, PALETTE, PriceChart, Sparkline } from "./charts";
import { useLivePortfolio, useMarket } from "./socket";
import {
  CLASS_META, fmtMoney, fmtPct, fmtQty, levelFromXp, toLocal,
} from "@/lib/finance";
import type { BehavioralIndex } from "@/lib/report-types";

export type PortfolioPosition = {
  symbol: string; name: string; class: string; sector: string | null; region: string;
  qty: number; avgUsd: number; avgLocal: number; priceUsd: number; priceLocal: number;
  value: number; cost: number; pnl: number; pnlPct: number; dayChange: number; dayPct: number;
  realized: number; bucket: string; esg: number; sentiment: number; headline: string | null;
};

export type PortfolioOrder = {
  id: number; symbol: string; side: string; qty: number; executed_price: number; notional: number;
  fee: number; tax: number; source: string; created_at: number; name: string;
};

export type PortfolioTx = {
  id: number; kind: string; amount: number; bucket: string; note: string; created_at: number;
};

export type PortfolioPayload = {
  positions: PortfolioPosition[];
  crypto: PortfolioPosition[];
  cash: number;
  cryptoCash: number;
  invested: number;
  marketValue: number;
  cryptoValue: number;
  total: number;
  dayChange: number;
  dayPct: number;
  unrealized: number;
  realized: number;
  feesPaid: number;
  taxPaid: number;
  allocation: Array<{ key: string; label: string; value: number; pct: number }>;
};

function Kpi({
  label, value, sub, tone = "neutral", icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "green" | "red" | "amber" | "violet";
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const colors: Record<string, string> = {
    neutral: "text-ink",
    green: "text-[#5beeb9]",
    red: "text-[#ff8fa3]",
    amber: "text-[#ffd08d]",
    violet: "text-[#b3a8ff]",
  };
  const rings: Record<string, string> = {
    neutral: "border-white/[0.07] bg-white/[0.03] text-muted",
    green: "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.08)] text-[#5beeb9]",
    red: "border-[rgba(255,93,122,.2)] bg-[rgba(255,93,122,.08)] text-[#ff8fa3]",
    amber: "border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.08)] text-[#ffd08d]",
    violet: "border-[rgba(139,123,255,.2)] bg-[rgba(139,123,255,.08)] text-[#b3a8ff]",
  };
  return (
    <div className="card-soft flex items-center gap-3 p-3.5">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", rings[tone])}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
        <div className={cn("num mt-0.5 truncate text-[15px] font-semibold leading-tight", colors[tone])}>{value}</div>
        {sub && <div className="mt-0.5 truncate text-[9px] text-muted/70">{sub}</div>}
      </div>
    </div>
  );
}

function behaviorColor(score: number | null) {
  if (score === null) return "#8a97ad";
  if (score >= 70) return "#5beeb9";
  if (score >= 50) return "#ffd08d";
  return "#ff8fa3";
}

function BehavioralCard({ behavioral }: { behavioral: BehavioralIndex }) {
  const score = behavioral.score;
  const color = behaviorColor(score);
  const tone = score === null ? "neutral" : score >= 70 ? "green" : score >= 50 ? "amber" : "red";
  return (
    <Card className="p-5">
      <SectionHead
        title="Behavioural index"
        subtitle="Built from your real simulated record"
        action={<Badge tone={tone}>{behavioral.band}</Badge>}
      />
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div
          className="relative h-[112px] w-[112px] shrink-0 rounded-full"
          style={{ background: `conic-gradient(${color} ${(score ?? 0) * 3.6}deg, rgba(255,255,255,.07) 0deg)` }}
        >
          <div className="absolute inset-[13px] flex flex-col items-center justify-center rounded-full bg-[#0a0e16]">
            <span className="num text-[26px] font-semibold leading-none" style={{ color }}>{score ?? "—"}</span>
            <span className="mt-1 text-[9px] uppercase tracking-wide text-muted">/ 100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold" style={{ color }}>{behavioral.band}</div>
          <div className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
            {behavioral.coverage}% signal coverage · missing signals are excluded, never estimated.
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-muted">
            <span><strong className="text-ink">{behavioral.metrics.orders}</strong> fills</span>
            <span><strong className="text-ink">{behavioral.metrics.activeDays}</strong> active days</span>
            <span><strong className="text-ink">{behavioral.metrics.turnover.toFixed(1)}×</strong> turnover</span>
            <span><strong className="text-ink">{behavioral.metrics.modulesDone}</strong> modules</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {behavioral.components.map((c) => (
          <div key={c.key}>
            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold">
              <span className="truncate text-[#c9d2e2]">{c.label}</span>
              <span className="num shrink-0" style={{ color: behaviorColor(c.score) }}>{c.score ?? "—"}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full"
                style={{ width: `${c.score ?? 0}%`, background: behaviorColor(c.score) }}
              />
            </div>
            <div className="mt-0.5 truncate text-[8.5px] text-muted/70">{c.detail}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReportCard({ analysis }: { analysis: string[] }) {
  return (
    <Card className="flex flex-col p-5">
      <SectionHead
        title="Report & analysis"
        subtitle="Everything you can export"
        action={<Badge tone="violet"><FileText size={10} /> Exportable</Badge>}
      />
      <ul className="mt-3 flex-1 space-y-2">
        {analysis.slice(0, 5).map((line) => (
          <li key={line} className="flex gap-2 text-[10.5px] leading-relaxed text-[#c9d2e2]">
            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[#2fe3a0]" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/portfolio/report" className="btn btn-primary btn-sm"><FileText size={13} /> Open report</Link>
        <a href="/api/portfolio/report?format=csv" className="btn btn-dark btn-sm"><Download size={13} /> CSV</a>
        <a href="/api/portfolio/report?format=html" className="btn btn-dark btn-sm"><FileText size={13} /> HTML</a>
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-muted/70">
        Includes the behavioural index, holdings, allocation, execution ledger, transactions and analysis. Print or save
        the report page as a PDF.
      </p>
    </Card>
  );
}

function AllocationCard({ portfolio, region }: { portfolio: PortfolioPayload; region: string }) {
  const data = portfolio.allocation.map((a, i) => ({
    label: a.label,
    value: a.value,
    pct: a.pct,
    color: a.key === "cash" ? "#5b6a82" : PALETTE[i % 5],
  }));
  return (
    <Card className="p-5">
      <SectionHead title="Allocation" subtitle="Main account, cash included" />
      {data.length === 0 ? (
        <div className="py-8 text-center text-[11px] text-muted">No allocation yet.</div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-5">
            <Donut
              data={data}
              size={146}
              thickness={16}
              centerValue={fmtMoney(portfolio.total, region, true)}
              centerLabel="total"
            />
            <div className="min-w-0 flex-1 space-y-2">
              {data.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: d.color }} />
                  <span className="min-w-0 flex-1 truncate text-[10.5px] text-[#c9d2e2]">{d.label}</span>
                  <span className="num shrink-0 text-[10px] font-semibold">{d.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.05] pt-3">
            <div>
              <div className="text-[9px] uppercase tracking-wide text-muted">Main cash</div>
              <div className="num mt-0.5 text-[12px] font-semibold">{fmtMoney(portfolio.cash, region)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wide text-muted">Crypto sandbox</div>
              <div className="num mt-0.5 text-[12px] font-semibold text-[#ff8fa3]">{fmtMoney(portfolio.cryptoCash + portfolio.cryptoValue, region)}</div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export function PortfolioView({
  portfolio,
  history,
  orders,
  transactions,
  region,
  rank,
  accuracy,
  behavioral,
  analysis,
}: {
  portfolio: PortfolioPayload;
  history: Array<{ t: number; v: number }>;
  orders: PortfolioOrder[];
  transactions: PortfolioTx[];
  region: string;
  rank: { rank: number; returnPct: number; xp: number } | null;
  accuracy: number;
  behavioral: BehavioralIndex;
  analysis: string[];
}) {
  const { prices } = useMarket();
  const live = useLivePortfolio(portfolio.positions, portfolio.cash, region);
  const [range, setRange] = useState<"1M" | "3M" | "6M" | "ALL">("1M");
  const [tab, setTab] = useState<"orders" | "transactions">("orders");

  const cryptoLive = useMemo(() => {
    let value = 0;
    let cost = 0;
    let day = 0;
    const rows = portfolio.crypto.map((p) => {
      const tick = prices[p.symbol];
      const priceUsd = tick?.p ?? p.priceUsd;
      const priceLocal = toLocal(priceUsd, region);
      const v = priceLocal * p.qty;
      const c = p.avgLocal * p.qty;
      const dc = tick ? toLocal(tick.p - tick.pc, region) * p.qty : p.dayChange;
      value += v;
      cost += c;
      day += dc;
      return { ...p, priceUsd, priceLocal, value: v, cost: c, pnl: v - c, pnlPct: c > 0 ? ((v - c) / c) * 100 : 0, dayChange: dc };
    });
    return { rows, value, cost, day, pnl: value - cost };
  }, [portfolio.crypto, prices, region]);

  const chartPoints = useMemo(() => {
    const n = range === "1M" ? 30 : range === "3M" ? 90 : range === "6M" ? 180 : history.length;
    return history.slice(-n).map((h) => ({ t: h.t, v: h.v }));
  }, [history, range]);

  const periodStart = chartPoints[0]?.v ?? live.marketValue;
  const periodPct = periodStart > 0 ? ((live.marketValue - periodStart) / periodStart) * 100 : 0;
  const periodAbs = live.marketValue - periodStart;
  const hasPositions = portfolio.positions.length > 0;

  const positions = live.positions;
  const totalMain = live.marketValue;
  const weightOf = (v: number) => (totalMain > 0 ? (v / totalMain) * 100 : 0);
  const level = levelFromXp(rank?.xp ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">Portfolio</h1>
            <span className="chip chip-green"><span className="h-1 w-1 animate-pulse-soft rounded-full bg-[#2fe3a0]" /> live marks</span>
          </div>
          <p className="mt-1 text-[12px] text-muted">Every position marked against the live simulated tape, net of fees and tax.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/portfolio/report" className="btn btn-dark btn-sm"><FileText size={13} /> Report</Link>
          <Link href="/markets" className="btn btn-dark btn-sm"><Layers size={13} /> Browse markets</Link>
          <Link href="/trade" className="btn btn-primary btn-sm"><CandlestickChart size={13} /> Trade</Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* hero + chart */}
        <Card className="overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(47,227,160,.13), transparent 65%)" }} />
          <div className="relative p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="eyebrow">Invested portfolio value</div>
                <div className="mt-2 flex flex-wrap items-end gap-2.5">
                  <div className="num text-[32px] font-semibold leading-none tracking-tight sm:text-[40px]">{fmtMoney(live.marketValue, region)}</div>
                  {hasPositions ? (
                    <div className="mb-1 flex items-center gap-1.5">
                      <ChangePill value={live.dayPct} showIcon />
                      <span className="text-[10.5px] text-muted">{fmtMoney(live.dayChange, region)} today</span>
                    </div>
                  ) : (
                    <span className="mb-1.5 rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-muted">Nothing invested yet</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-muted">
                  {hasPositions ? (
                    <>
                      <span className={cn("flex items-center gap-1", periodPct >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                        {periodPct >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {fmtPct(periodPct)} over period
                      </span>
                      <span className="text-muted/50">·</span>
                      <span>{fmtMoney(periodAbs, region)} change</span>
                    </>
                  ) : (
                    <span>Cash available {fmtMoney(portfolio.cash, region)} · account total {fmtMoney(live.total, region)}</span>
                  )}
                  {rank && (
                    <>
                      <span className="text-muted/50">·</span>
                      <span className="flex items-center gap-1"><Sparkles size={10} className="text-[#ffd08d]" /> Rank #{rank.rank} · Lv {level.level}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-1">
                {(["1M", "3M", "6M", "ALL"] as const).map((r) => (
                  <button key={r} onClick={() => setRange(r)}
                    className={cn("rounded-md px-2 py-1 text-[10px] font-semibold transition", range === r ? "bg-white/[0.09] text-ink" : "text-muted hover:text-ink")}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              {chartPoints.length > 1 ? (
                <PriceChart data={chartPoints} height={190} />
              ) : (
                <div className="flex h-[190px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.07] text-center">
                  <Wallet size={20} className="text-muted/50" />
                  <div className="text-[11px] text-muted">Your history appears once you hold a position.</div>
                  <Link href="/trade" className="inline-flex min-h-8 items-center px-2 text-[10.5px] font-semibold text-[#5beeb9] hover:underline">Place your first trade</Link>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.04] sm:grid-cols-4">
            {[
              ["Invested", fmtMoney(live.cost, region)],
              ["Market value", fmtMoney(live.marketValue, region)],
              ["Unrealised", `${live.unrealized >= 0 ? "+" : ""}${fmtMoney(live.unrealized, region)}`],
              ["Realised", `${portfolio.realized >= 0 ? "+" : ""}${fmtMoney(portfolio.realized, region)}`],
            ].map(([l, v], i) => (
              <div key={l} className="bg-[#0a0e16] px-3.5 py-2.5">
                <div className="text-[9px] uppercase tracking-[0.1em] text-muted">{l}</div>
                <div className={cn("num mt-1 text-[12px] font-semibold",
                  i === 2 ? (live.unrealized >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")
                    : i === 3 ? (portfolio.realized >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]") : "")}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        <AllocationCard portfolio={{ ...portfolio, total: live.total }} region={region} />
      </div>

      {/* kpis */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Main cash" value={fmtMoney(portfolio.cash, region)} sub="Ready to deploy" icon={Wallet} tone="green" />
        <Kpi label="Fees paid" value={fmtMoney(portfolio.feesPaid, region)} sub="Brokerage on every fill" icon={Receipt} tone="amber" />
        <Kpi label="Tax paid" value={fmtMoney(portfolio.taxPaid, region)} sub="On realised gains" icon={Coins} tone="red" />
        <Kpi label="AI accuracy" value={`${accuracy.toFixed(1)}%`} sub="Public forecast record" icon={Sparkles} tone="violet" />
      </div>

      {/* behavioural report */}
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <BehavioralCard behavioral={behavioral} />
        <ReportCard analysis={analysis} />
      </div>

      {/* positions */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-4">
          <SectionHead title="Open positions" subtitle={`${positions.length} main account ${positions.length === 1 ? "holding" : "holdings"}`} />
          <div className="flex items-center gap-2">
            <Badge tone="green"><ShieldCheck size={10} /> Main account</Badge>
            <span className="num text-[11px] font-semibold">{fmtMoney(live.marketValue, region)}</span>
          </div>
        </div>

        {positions.length === 0 ? (
          <EmptyState
            icon={<PiggyBank size={20} />}
            title="No open positions"
            body="Your main account is all cash. Buy a stock, fund or ETF to start building a track record."
            action={<Link href="/markets" className="btn btn-primary btn-sm">Explore markets <ChevronRight size={13} /></Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-[9px] uppercase tracking-[0.1em] text-muted">
                  <th className="px-4 py-2.5 font-semibold">Instrument</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Avg cost</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Live price</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Market value</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Day</th>
                  <th className="px-3 py-2.5 text-right font-semibold">P&amp;L</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Weight</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Report</th>
                  <th className="px-4 py-2.5 text-right font-semibold" />
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.symbol} className="table-row border-b border-white/[0.035] last:border-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/markets/${p.symbol}`} className="group flex items-center gap-2.5">
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[8.5px] font-bold",
                          p.pnl >= 0 ? "border-[rgba(47,227,160,.18)] bg-[rgba(47,227,160,.07)] text-[#5beeb9]" : "border-[rgba(255,93,122,.18)] bg-[rgba(255,93,122,.07)] text-[#ff8fa3]")}>
                          {p.symbol.slice(0, 3)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11.5px] font-semibold group-hover:text-[#5beeb9]">{p.symbol}</span>
                          <span className="block max-w-[170px] truncate text-[9px] text-muted">{p.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="num px-3 py-2.5 text-right text-[10.5px]">{fmtQty(p.qty)}</td>
                    <td className="num px-3 py-2.5 text-right text-[10.5px] text-muted">{fmtMoney(p.avgLocal, region)}</td>
                    <td className="num px-3 py-2.5 text-right text-[10.5px] font-medium">{fmtMoney(p.priceLocal, region)}</td>
                    <td className="num px-3 py-2.5 text-right text-[10.5px] font-semibold">{fmtMoney(p.value, region)}</td>
                    <td className="px-3 py-2.5 text-right"><ChangePill value={p.dayPct} /></td>
                    <td className="px-3 py-2.5 text-right">
                      <div className={cn("num text-[10.5px] font-semibold", p.pnl >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                        {p.pnl >= 0 ? "+" : ""}{fmtMoney(p.pnl, region)}
                      </div>
                      <div className={cn("num text-[9px]", p.pnl >= 0 ? "text-[#5beeb9]/70" : "text-[#ff8fa3]/70")}>{fmtPct(p.pnlPct)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-1 w-10 overflow-hidden rounded-full bg-white/[0.07]">
                          <div className="h-full rounded-full bg-[#2fe3a0]" style={{ width: `${Math.min(100, weightOf(p.value))}%` }} />
                        </div>
                        <span className="num w-8 text-[9.5px] text-muted">{weightOf(p.value).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link href={`/portfolio/report?symbol=${p.symbol}`} className="btn btn-dark btn-sm h-7 px-2.5 text-[10px]">
                        <FileText size={11} /> Report
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/trade?symbol=${p.symbol}`} className="btn btn-dark btn-sm h-7 px-2.5 text-[10px]">Trade</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* crypto sandbox */}
      <Card className="overflow-hidden border-[rgba(255,93,122,.16)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(255,93,122,.14)] bg-[rgba(255,93,122,.035)] p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,93,122,.22)] bg-[rgba(255,93,122,.08)] text-[#ff8fa3]"><Bitcoin size={15} /></span>
            <div>
              <div className="text-[12px] font-semibold">Crypto sandbox</div>
              <div className="text-[9.5px] text-muted">Isolated capital. Volatility is the lesson, not the goal.</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span>Cash {fmtMoney(portfolio.cryptoCash, region)}</span>
            <span className="text-muted/40">·</span>
            <span className={cn("num font-semibold", cryptoLive.pnl >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
              {cryptoLive.pnl >= 0 ? "+" : ""}{fmtMoney(cryptoLive.pnl, region)}
            </span>
          </div>
        </div>

        {cryptoLive.rows.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Info size={12} /> No crypto exposure. The sandbox stays empty until you deliberately move capital in.
            </div>
            <Link href="/markets" className="btn btn-dark btn-sm">Browse crypto</Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {cryptoLive.rows.map((p) => (
              <div key={p.symbol} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="w-[80px] shrink-0 text-[10.5px] font-semibold">{p.symbol}</span>
                <span className="num w-[70px] shrink-0 text-right text-[10px] text-muted">{fmtQty(p.qty)}</span>
                <span className="num flex-1 text-right text-[10px]">{fmtMoney(p.priceLocal, region)}</span>
                <span className="num w-[96px] text-right text-[10.5px] font-semibold">{fmtMoney(p.value, region)}</span>
                <span className={cn("num w-[68px] text-right text-[10px] font-semibold", p.pnl >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>{fmtPct(p.pnlPct)}</span>
                <Link href={`/trade?symbol=${p.symbol}`} className="btn btn-dark btn-sm h-7 px-2.5 text-[9.5px]">Trade</Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* activity */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-3">
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-0.5">
            <button onClick={() => setTab("orders")}
              className={cn("rounded-md px-3 py-1.5 text-[10.5px] font-semibold transition", tab === "orders" ? "bg-white/[0.09] text-ink" : "text-muted hover:text-ink")}>
              Orders
            </button>
            <button onClick={() => setTab("transactions")}
              className={cn("rounded-md px-3 py-1.5 text-[10.5px] font-semibold transition", tab === "transactions" ? "bg-white/[0.09] text-ink" : "text-muted hover:text-ink")}>
              Transactions
            </button>
          </div>
          <span className="text-[9.5px] text-muted">{tab === "orders" ? "Execution ledger" : "Cash & credit ledger"}</span>
        </div>

        {tab === "orders" ? (
          orders.length === 0 ? (
            <EmptyState icon={<Receipt size={18} />} title="No executions yet" body="Every simulated fill will appear here with its fee and tax breakdown." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[9px] uppercase tracking-[0.1em] text-muted">
                    <th className="px-4 py-2.5 font-semibold">Time</th>
                    <th className="px-3 py-2.5 font-semibold">Side</th>
                    <th className="px-3 py-2.5 font-semibold">Instrument</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Fill</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Notional</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Fee</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Tax</th>
                    <th className="px-4 py-2.5 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-white/[0.035] last:border-0">
                      <td className="px-4 py-2.5 text-[9.5px] text-muted">
                        {new Date(o.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold",
                          o.side === "BUY" ? "bg-[rgba(47,227,160,.1)] text-[#5beeb9]" : "bg-[rgba(255,93,122,.1)] text-[#ff8fa3]")}>{o.side}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[10.5px] font-semibold">{o.symbol}</div>
                        <div className="max-w-[150px] truncate text-[9px] text-muted">{o.name}</div>
                      </td>
                      <td className="num px-3 py-2.5 text-right text-[10px]">{fmtQty(o.qty)}</td>
                      <td className="num px-3 py-2.5 text-right text-[10px]">{fmtMoney(o.executed_price, region)}</td>
                      <td className="num px-3 py-2.5 text-right text-[10px]">{fmtMoney(o.notional, region)}</td>
                      <td className="num px-3 py-2.5 text-right text-[10px] text-[#ffd08d]">{fmtMoney(o.fee, region)}</td>
                      <td className="num px-3 py-2.5 text-right text-[10px] text-[#ff8fa3]">{o.tax > 0 ? fmtMoney(o.tax, region) : "—"}</td>
                      <td className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-muted">{o.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : transactions.length === 0 ? (
          <EmptyState icon={<Coins size={18} />} title="No transactions" body="Credit rewards, unlocks and simulated cash movements will be listed here." />
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                  t.amount >= 0 ? "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.07)] text-[#5beeb9]" : "border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.07)] text-[#ffd08d]")}>
                  {t.amount >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10.5px] font-medium">{t.note}</div>
                  <div className="text-[9px] uppercase tracking-wide text-muted">{t.kind.replace(/_/g, " ")} · {t.bucket}</div>
                </div>
                <span className="text-[9px] text-muted/70">{new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className={cn("num w-[90px] text-right text-[10.5px] font-semibold", t.amount >= 0 ? "text-[#5beeb9]" : "text-[#ffd08d]")}>
                  {t.amount >= 0 ? "+" : ""}{t.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.055] bg-white/[0.015] px-4 py-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5"><Droplets size={11} /> Slippage is already embedded in every executed price.</span>
        <span className="flex items-center gap-1.5"><ShieldCheck size={11} className="text-[#5beeb9]" /> Simulation only — no real capital at risk.</span>
      </div>
    </div>
  );
}
