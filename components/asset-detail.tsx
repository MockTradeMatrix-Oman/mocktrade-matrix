"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowUpRight, BrainCircuit, Building2, CandlestickChart, ChevronRight,
  Info, Layers, Minus, Plus, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Zap,
} from "lucide-react";
import { Badge, Card, ChangePill, SectionHead, Segmented, cn } from "./ui";
import { PriceChart, Sparkline, type ChartPoint } from "./charts";
import { useMarket } from "./socket";
import { useToast } from "./toast";
import {
  CLASS_META, BROKERAGE, TAX, brokerageFor, estimateOrder, fmtMoney, fmtNum, fmtPct, fmtQty,
  toLocal,
} from "@/lib/finance";

export type DetailAsset = {
  symbol: string;
  name: string;
  class: string;
  region: string;
  sector: string | null;
  price: number;
  prev_close: number;
  day_open: number;
  base_price: number;
  volatility: number;
  sentiment: number;
  headline: string | null;
  esg: number;
  about: string | null;
};

export type DetailForecast = {
  direction: string;
  confidence: number;
  start_price: number;
  target_price: number;
  created_at: number;
} | null;

type Range = "1D" | "1W" | "1M" | "1Y";

export function AssetDetail({
  asset,
  initialPoints,
  region,
  cash,
  cryptoCash,
  holding,
  forecast,
  accuracy,
  related,
}: {
  asset: DetailAsset;
  initialPoints: ChartPoint[];
  region: string;
  cash: number;
  cryptoCash: number;
  holding: { qty: number; avgLocal: number } | null;
  forecast: DetailForecast;
  accuracy: number;
  related: Array<{ symbol: string; name: string; class: string; price: number; prev_close: number; spark: number[] }>;
}) {
  const router = useRouter();
  const { push } = useToast();
  const { prices, headlines } = useMarket();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const tick = mounted ? prices[asset.symbol] : undefined;
  const priceUsd = tick?.p ?? asset.price;
  const priceLocal = toLocal(priceUsd, region);
  const chg = tick?.chg ?? (asset.prev_close ? ((priceUsd - asset.prev_close) / asset.prev_close) * 100 : 0);
  const up = chg >= 0;
  const headline = headlines[asset.symbol] ?? asset.headline;
  const sentiment = tick?.sent ?? asset.sentiment;

  const [range, setRange] = useState<Range>("1D");
  const [points, setPoints] = useState<ChartPoint[]>(initialPoints);
  const [loading, setLoading] = useState(false);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const bucket = asset.class === "crypto" ? "crypto" : "main";
  const available = bucket === "crypto" ? cryptoCash : cash;

  useEffect(() => {
    if (range === "1D") {
      setPoints(initialPoints);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/market/history?symbol=${asset.symbol}&range=${range}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.points) setPoints(d.points); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range, asset.symbol, initialPoints]);

  // live-update the last point on the 1D chart
  const lastRef = useRef(priceLocal);
  useEffect(() => {
    if (range !== "1D") return;
    lastRef.current = priceLocal;
    setPoints((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { t: Math.floor(Date.now() / 1000), v: priceLocal };
      if (last.t === next[next.length - 1].t) next[next.length - 1] = { t: last.t + 1, v: priceLocal };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceLocal, range]);

  const estimate = useMemo(() => {
    const n = Number(qty) || 0;
    if (n <= 0) return null;
    return estimateOrder({
      side, qty: n, priceUsd, cls: asset.class, region,
      avgPriceUsd: holding ? toLocal(holding.avgLocal, region) / (region === "IN" ? 83.2 : 1) : priceUsd,
    });
  }, [qty, side, priceUsd, asset.class, region, holding]);

  const maxQty = useMemo(() => {
    if (side === "SELL") return holding?.qty ?? 0;
    const budget = available;
    const per = priceLocal * 1.03;
    return Math.max(0, Math.floor(budget / per));
  }, [side, holding, available, priceLocal]);

  const high = Math.max(...initialPoints.map((p) => p.v), priceLocal);
  const low = Math.min(...initialPoints.map((p) => p.v), priceLocal);

  async function submit() {
    const n = Number(qty);
    if (!n || n <= 0) { push({ tone: "error", title: "Enter a quantity", body: "Quantity must be greater than zero." }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: asset.symbol, side, qty: n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order rejected.");
      push({ tone: "success", title: "Order filled", body: data.message });
      setQty("1");
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Order rejected", body: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const cls = CLASS_META[asset.class] ?? { label: asset.class, short: "MT" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-[10px] text-muted">
        <Link href="/markets" className="flex items-center gap-1 hover:text-ink"><ArrowLeft size={11} /> Markets</Link>
        <ChevronRight size={10} />
        <span className="text-[#c9d2e2]">{asset.symbol}</span>
      </div>

      {/* header */}
      <Card className="overflow-hidden">
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-[12px] font-bold",
                up ? "border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.09)] text-[#5beeb9]" : "border-[rgba(255,93,122,.22)] bg-[rgba(255,93,122,.09)] text-[#ff8fa3]")}>
                {asset.symbol.slice(0, 3)}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[22px] font-semibold tracking-tight">{asset.symbol}</h1>
                  <Badge>{cls.label}</Badge>
                  <Badge tone={asset.region === "IN" ? "amber" : "cyan"}>{asset.region === "IN" ? "India" : asset.region === "US" ? "United States" : "Global"}</Badge>
                  {asset.sector && <Badge tone="violet">{asset.sector}</Badge>}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">{asset.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="num text-[28px] font-semibold leading-none">{fmtMoney(priceLocal, region)}</div>
              <div className="mt-1.5 flex items-center justify-end gap-2">
                <ChangePill value={chg} showIcon />
                <span className="text-[10.5px] text-muted">{fmtMoney(toLocal(priceUsd - asset.prev_close, region), region)} today</span>
              </div>
            </div>
          </div>

          {headline && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <Sparkles size={12} className="mt-0.5 shrink-0 text-[#ffd08d]" />
              <div className="text-[10.5px] leading-relaxed text-[#b9c2d2]">{headline}</div>
              <span className={cn("ml-auto shrink-0 text-[9px] font-semibold",
                sentiment > 0.1 ? "text-[#5beeb9]" : sentiment < -0.1 ? "text-[#ff8fa3]" : "text-muted")}>
                {sentiment > 0.35 ? "very positive" : sentiment > 0.1 ? "positive" : sentiment < -0.35 ? "very negative" : sentiment < -0.1 ? "negative" : "neutral"}
              </span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href={`/trade?symbol=${asset.symbol}`} className="btn btn-primary btn-sm"><CandlestickChart size={13} /> Full terminal</Link>
            <Link href="/portfolio" className="btn btn-dark btn-sm">View portfolio</Link>
            {holding && (
              <span className="chip chip-green"><ShieldCheck size={10} /> Holding {fmtQty(holding.qty)} · avg {fmtMoney(holding.avgLocal, region)}</span>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        {/* chart + stats */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-3.5">
              <div>
                <div className="text-[11.5px] font-semibold">Price action</div>
                <div className="text-[9.5px] text-muted">{range === "1D" ? "Intraday · 2-minute candles" : range === "1W" ? "Last 7 sessions" : range === "1M" ? "Last 30 sessions" : "Last 220 sessions"}</div>
              </div>
              <Segmented
                size="sm"
                value={range}
                onChange={(r) => setRange(r)}
                options={[
                  { id: "1D", label: "1D" },
                  { id: "1W", label: "1W" },
                  { id: "1M", label: "1M" },
                  { id: "1Y", label: "1Y" },
                ]}
              />
            </div>
            <div className="relative p-3">
              {loading && <div className="skeleton absolute inset-x-3 top-3 z-10 rounded-xl" style={{ height: 320 }} />}
              <PriceChart data={points} height={320} showTime={range === "1D"} />
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.04] sm:grid-cols-4">
              {[
                ["Day open", fmtMoney(toLocal(asset.day_open, region), region)],
                ["Prev close", fmtMoney(toLocal(asset.prev_close, region), region)],
                ["Session high", fmtMoney(high, region)],
                ["Session low", fmtMoney(low, region)],
              ].map(([l, v]) => (
                <div key={l} className="bg-[#0a0e16] px-3.5 py-2.5">
                  <div className="text-[9px] uppercase tracking-[0.1em] text-muted">{l}</div>
                  <div className="num mt-1 text-[11.5px] font-semibold">{v}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <SectionHead title="About" subtitle={cls.label} />
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">{asset.about ?? "A simulated instrument on the MockTrade Matrix universe."}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted">ESG score</div>
                  <div className={cn("num mt-1 text-[13px] font-semibold", asset.esg >= 75 ? "text-[#5beeb9]" : asset.esg >= 55 ? "text-[#ffd08d]" : "text-[#ff8fa3]")}>{asset.esg}/100</div>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted">Volatility</div>
                  <div className="num mt-1 text-[13px] font-semibold">{(asset.volatility * 100).toFixed(2)}%</div>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col p-4">
              <SectionHead title="Cost model" subtitle="Applied on every execution" />
              <div className="mt-2.5 divide-y divide-white/[0.04]">
                {[
                  ["Brokerage", `${(BROKERAGE[asset.class] * 100).toFixed(2)}%`, "per fill"],
                  ["Slippage", `${asset.class === "crypto" ? "0.14–0.50" : "0.06–0.24"}%`, "execution drift"],
                  ["Capital gains tax", `${(TAX[asset.class]?.[region as "IN" | "US"] * 100).toFixed(0)}%`, "on realised gains"],
                ].map(([l, v, n]) => (
                  <div key={l} className="flex items-center justify-between py-2 text-[10.5px]">
                    <span className="text-muted">{l}</span>
                    <span className="flex items-center gap-1.5"><span className="num font-semibold text-[#ffd08d]">{v}</span><span className="text-[9px] text-muted/60">{n}</span></span>
                  </div>
                ))}
              </div>
              <div className="mt-auto flex items-start gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                <Info size={11} className="mt-0.5 shrink-0 text-muted" />
                <p className="text-[9.5px] leading-relaxed text-muted">This is a simulation. No real asset changes hands and no real tax is owed.</p>
              </div>
            </Card>
          </div>
        </div>

        {/* right column: forecast + ticket */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[rgba(139,123,255,.22)] bg-[rgba(139,123,255,.1)] text-[#b3a8ff]"><BrainCircuit size={13} /></span>
                <div>
                  <div className="text-[11.5px] font-semibold">AI trend signal</div>
                  <div className="text-[9px] uppercase tracking-[0.1em] text-muted">LSTM ensemble · 1D</div>
                </div>
              </div>
              <Badge tone="violet">{accuracy.toFixed(1)}% acc</Badge>
            </div>
            <div className="p-4">
              {forecast ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide",
                      forecast.direction === "bullish" ? "bg-[rgba(47,227,160,.1)] text-[#5beeb9]" : forecast.direction === "bearish" ? "bg-[rgba(255,93,122,.1)] text-[#ff8fa3]" : "bg-white/[0.06] text-muted")}>
                      {forecast.direction === "bullish" ? <TrendingUp size={11} /> : forecast.direction === "bearish" ? <TrendingDown size={11} /> : null}
                      {forecast.direction}
                    </span>
                    <span className="num text-[11px] font-semibold text-[#b3a8ff]">{(forecast.confidence * 100).toFixed(1)}% confidence</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#6f5cff] to-[#b3a8ff]" style={{ width: `${forecast.confidence * 100}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/[0.05] bg-black/20 p-2.5">
                      <div className="text-[9px] uppercase tracking-wide text-muted">Live</div>
                      <div className="num mt-1 text-[11.5px] font-semibold">{fmtMoney(priceLocal, region)}</div>
                    </div>
                    <div className="rounded-lg border border-white/[0.05] bg-black/20 p-2.5">
                      <div className="text-[9px] uppercase tracking-wide text-muted">Target</div>
                      <div className={cn("num mt-1 text-[11.5px] font-semibold", forecast.target_price >= priceUsd ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                        {fmtMoney(toLocal(forecast.target_price, region), region)}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[9.5px] leading-relaxed text-muted">
                    Forecasts resolve every 90 seconds and are scored publicly. They are educational, not advice.
                  </p>
                </>
              ) : (
                <div className="py-6 text-center text-[11px] text-muted">No active forecast for this instrument.</div>
              )}
            </div>
          </Card>

          {/* ticket */}
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11.5px] font-semibold">Quick order</div>
                <span className="text-[9.5px] text-muted">Available {fmtMoney(available, region)}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-1">
                <button onClick={() => setSide("BUY")}
                  className={cn("h-8 rounded-lg text-[11.5px] font-bold transition", side === "BUY" ? "bg-[rgba(47,227,160,.14)] text-[#5beeb9]" : "text-muted hover:text-ink")}>
                  Buy
                </button>
                <button onClick={() => setSide("SELL")}
                  className={cn("h-8 rounded-lg text-[11.5px] font-bold transition", side === "SELL" ? "bg-[rgba(255,93,122,.14)] text-[#ff8fa3]" : "text-muted hover:text-ink")}>
                  Sell
                </button>
              </div>

              <div className="mt-3">
                <label className="label">Quantity</label>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setQty((q) => String(Math.max(0, (Number(q) || 0) - 1)))} className="btn btn-dark h-11 w-11 shrink-0 px-0"><Minus size={13} /></button>
                  <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className="input h-11 text-center" />
                  <button onClick={() => setQty((q) => String((Number(q) || 0) + 1))} className="btn btn-dark h-11 w-11 shrink-0 px-0"><Plus size={13} /></button>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {[25, 50, 75, 100].map((p) => (
                    <button key={p} onClick={() => setQty(String(Math.max(0, Math.floor(maxQty * (p / 100)))))}
                      className="flex-1 rounded-md border border-white/[0.07] bg-white/[0.02] py-1 text-[9.5px] font-semibold text-muted transition hover:border-white/15 hover:text-ink">
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 space-y-1.5 rounded-xl border border-white/[0.05] bg-black/20 p-3">
                {[
                  ["Price", fmtMoney(priceLocal, region)],
                  ["Exec. price (est.)", estimate ? fmtMoney(estimate.executedLocal, region) : "—"],
                  ["Notional", estimate ? fmtMoney(estimate.notional, region) : "—"],
                  ["Brokerage", estimate ? fmtMoney(estimate.fee, region) : "—"],
                  ["Tax", estimate ? fmtMoney(estimate.tax, region) : "—"],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted">{l}</span>
                    <span className="num font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-1.5 text-[11px]">
                  <span className="text-muted">{side === "BUY" ? "Total debit" : "Net proceeds"}</span>
                  <span className="num font-semibold">{estimate ? fmtMoney(estimate.total, region) : "—"}</span>
                </div>
              </div>

              <button onClick={submit} disabled={submitting || !estimate}
                className={cn("btn mt-3 w-full", side === "BUY" ? "btn-primary" : "btn-danger")}>
                {submitting ? "Placing order…" : `${side === "BUY" ? "Buy" : "Sell"} ${asset.symbol}`}
              </button>
              <p className="mt-2 text-center text-[9px] text-muted/60">Simulated execution · brokerage + slippage applied</p>
            </div>
          </Card>
        </div>
      </div>

      {/* related */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <SectionHead title="Related instruments" subtitle="Same asset class" />
          <Link href="/markets" className="text-[10.5px] font-semibold text-[#5beeb9] hover:underline">View universe</Link>
        </div>
        <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-3">
          {related.map((r) => {
            const c = r.prev_close ? ((r.price - r.prev_close) / r.prev_close) * 100 : 0;
            return (
              <Link key={r.symbol} href={`/markets/${r.symbol}`} className="flex items-center gap-3 bg-[#0a0e16] p-3.5 transition hover:bg-[#0c111a]">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold">{r.symbol}</div>
                  <div className="truncate text-[9px] text-muted">{r.name}</div>
                </div>
                <Sparkline data={r.spark} width={58} height={22} tone={c >= 0 ? "green" : "red"} fill={false} strokeWidth={1.4} />
                <div className="text-right">
                  <div className="num text-[10.5px] font-medium">{fmtMoney(toLocal(r.price, region), region, true)}</div>
                  <div className={cn("num text-[9px] font-semibold", c >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>{fmtPct(c)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
