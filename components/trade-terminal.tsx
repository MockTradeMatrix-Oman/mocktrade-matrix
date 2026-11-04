"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp, ArrowUpRight, CandlestickChart, ChevronDown, Clock, Info, Layers,
  Minus, Plus, Search, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Wallet, Zap,
} from "lucide-react";
import { Badge, Card, ChangePill, SectionHead, cn } from "./ui";
import { PriceChart, type ChartPoint } from "./charts";
import { useMarket } from "./socket";
import { useToast } from "./toast";
import {
  CLASS_META, brokerageFor, estimateOrder, fmtMoney, fmtPct, fmtQty, toLocal,
} from "@/lib/finance";

export type TerminalAsset = {
  symbol: string;
  name: string;
  class: string;
  region: string;
  sector: string | null;
  price: number;
  prev_close: number;
  volatility: number;
  esg: number;
};

export type TerminalHolding = { symbol: string; qty: number; avgLocal: number };
export type TerminalOrder = {
  id: number; symbol: string; side: string; qty: number; executed_price: number;
  notional: number; fee: number; tax: number; source: string; created_at: number; name: string;
};

export function TradeTerminal({
  assets,
  region,
  cash,
  cryptoCash,
  holdings,
  orders,
  initialSymbol,
  initialPoints,
  verified,
}: {
  assets: TerminalAsset[];
  region: string;
  cash: number;
  cryptoCash: number;
  holdings: TerminalHolding[];
  orders: TerminalOrder[];
  initialSymbol: string;
  initialPoints: ChartPoint[];
  verified: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const { prices, headlines, connected } = useMarket();

  const [symbol, setSymbol] = useState(initialSymbol);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pickerRegion, setPickerRegion] = useState<"all" | "IN" | "US" | "GLOBAL">("all");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState("1");
  const [points, setPoints] = useState<ChartPoint[]>(initialPoints);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [watch, setWatch] = useState<string[]>(() => assets.slice(0, 8).map((a) => a.symbol));

  const asset = assets.find((a) => a.symbol === symbol) ?? assets[0];
  const tick = prices[symbol];
  const priceUsd = tick?.p ?? asset.price;
  const priceLocal = toLocal(priceUsd, region);
  const chg = tick?.chg ?? (asset.prev_close ? ((priceUsd - asset.prev_close) / asset.prev_close) * 100 : 0);
  const up = chg >= 0;
  const bucket = asset.class === "crypto" ? "crypto" : "main";
  const available = bucket === "crypto" ? cryptoCash : cash;
  const holding = holdings.find((h) => h.symbol === symbol);

  useEffect(() => {
    const param = searchParams.get("symbol");
    if (param && assets.some((a) => a.symbol === param.toUpperCase())) {
      setSymbol(param.toUpperCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/market/history?symbol=${symbol}&range=1D`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.points) setPoints(d.points); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  useEffect(() => {
    setPoints((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      next[next.length - 1] = { t: Math.floor(Date.now() / 1000), v: priceLocal };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceLocal]);

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
    return Math.max(0, Math.floor(available / (priceLocal * 1.03)));
  }, [side, holding, available, priceLocal]);

  const book = useMemo(() => {
    const base = priceLocal;
    const step = Math.max(0.01, base * 0.0004);
    const asks = Array.from({ length: 7 }, (_, i) => {
      const p = base + step * (7 - i);
      const q = 20 + ((i * 37 + symbol.length * 13) % 180);
      return { p, q };
    });
    const bids = Array.from({ length: 7 }, (_, i) => {
      const p = base - step * (i + 1);
      const q = 20 + ((i * 53 + symbol.length * 7) % 180);
      return { p, q };
    });
    const max = Math.max(...asks.map((a) => a.q), ...bids.map((b) => b.q));
    return { asks, bids, max };
  }, [priceLocal, symbol]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return assets
      .filter((a) => pickerRegion === "all" || a.region === pickerRegion)
      .filter((a) => !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
      .slice(0, 40);
  }, [assets, query, pickerRegion]);

  async function submit() {
    if (!verified) {
      push({ tone: "info", title: "Verify your identity", body: "Complete the ID check before placing orders." });
      router.push("/verify");
      return;
    }
    const n = Number(qty);
    if (!n || n <= 0) { push({ tone: "error", title: "Enter a quantity" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, side, qty: n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order rejected.");
      push({ tone: "success", title: `${side === "BUY" ? "Bought" : "Sold"} ${n} ${symbol}`, body: data.message });
      setQty("1");
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Order rejected", body: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">Trade terminal</h1>
            <span className={cn("chip", connected ? "chip-green" : "chip-amber")}>
              <span className={cn("h-1 w-1 rounded-full", connected ? "bg-[#2fe3a0]" : "bg-[#ffc061]")} /> {connected ? "live tape" : "reconnecting"}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted">Simulated execution with brokerage, slippage and tax applied on every fill.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span className="flex items-center gap-1.5"><Wallet size={12} /> Cash {fmtMoney(cash, region)}</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Crypto {fmtMoney(cryptoCash, region)}</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {/* symbol header */}
          <Card className="overflow-visible">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="relative">
                <button onClick={() => setPickerOpen((v) => !v)} className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 transition hover:border-white/15">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border text-[8.5px] font-bold",
                    up ? "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.08)] text-[#5beeb9]" : "border-[rgba(255,93,122,.2)] bg-[rgba(255,93,122,.08)] text-[#ff8fa3]")}>
                    {symbol.slice(0, 3)}
                  </span>
                  <span className="text-left">
                    <span className="block text-[12.5px] font-semibold">{symbol}</span>
                    <span className="block max-w-[130px] truncate text-[9px] text-muted">{asset.name}</span>
                  </span>
                  <ChevronDown size={13} className="text-muted" />
                </button>

                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setPickerOpen(false)} />
                    <div className="animate-pop absolute left-0 top-12 z-30 w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl">
                      <div className="border-b border-white/[0.06] p-2.5">
                        <div className="relative">
                          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search instruments…" className="input h-8 pl-8 text-[11px]" />
                        </div>
                        <div className="mt-2 flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-0.5">
                          {([["all", "All"], ["IN", "India"], ["US", "US"], ["GLOBAL", "Global"]] as const).map(([r, label]) => (
                            <button key={r} onClick={() => setPickerRegion(r)}
                              className={cn("flex-1 rounded-md px-2 py-1 text-[9.5px] font-semibold transition",
                                pickerRegion === r ? "bg-white/[0.09] text-ink" : "text-muted hover:text-ink")}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {filtered.map((a) => {
                          const t = prices[a.symbol];
                          const c = t?.chg ?? (a.prev_close ? ((a.price - a.prev_close) / a.prev_close) * 100 : 0);
                          return (
                            <button key={a.symbol} onClick={() => { setSymbol(a.symbol); setPickerOpen(false); setQuery(""); }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-white/[0.04]">
                              <span className="w-[78px] shrink-0 text-[10.5px] font-semibold">{a.symbol}</span>
                              <span className="min-w-0 flex-1 truncate text-[9.5px] text-muted">{a.name}</span>
                              <span className="num text-[9.5px] text-muted">{fmtMoney(toLocal(t?.p ?? a.price, region), region, true)}</span>
                              <span className={cn("num w-[46px] text-right text-[9px] font-semibold", c >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>{fmtPct(c)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="ml-auto flex items-center gap-3">
                <div className="text-right">
                  <div className="num text-[24px] font-semibold leading-none">{fmtMoney(priceLocal, region)}</div>
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    <ChangePill value={chg} showIcon />
                    <span className="text-[9.5px] text-muted">{asset.region}</span>
                  </div>
                </div>
              </div>
            </div>

            {headlines[symbol] && (
              <div className="flex items-start gap-2 border-t border-white/[0.05] px-4 py-2.5">
                <Sparkles size={11} className="mt-0.5 shrink-0 text-[#ffd08d]" />
                <div className="text-[10px] leading-relaxed text-muted">{headlines[symbol]}</div>
              </div>
            )}

            <div className="relative p-3">
              {loading && <div className="skeleton absolute inset-x-3 top-3 z-10 rounded-xl" style={{ height: 300 }} />}
              <PriceChart data={points} height={300} showTime />
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.04] sm:grid-cols-4">
              {[
                ["Class", CLASS_META[asset.class]?.label ?? asset.class],
                ["Sector", asset.sector ?? "—"],
                ["Volatility", `${(asset.volatility * 100).toFixed(2)}%`],
                ["ESG", `${asset.esg}/100`],
              ].map(([l, v]) => (
                <div key={l} className="bg-[#0a0e16] px-3.5 py-2.5">
                  <div className="text-[9px] uppercase tracking-[0.1em] text-muted">{l}</div>
                  <div className="mt-1 truncate text-[11px] font-semibold">{v}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* order book + history */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] p-3.5">
                <SectionHead title="Order book" subtitle="Simulated depth" />
                <span className="chip chip-green">spread {(priceLocal * 0.0008).toFixed(2)}</span>
              </div>
              <div className="p-3">
                {book.asks.map((a, i) => (
                  <div key={`a-${i}`} className="relative flex items-center justify-between px-1.5 py-[3px] text-[9.5px]">
                    <div className="absolute inset-y-[1px] right-0 rounded-sm bg-[rgba(255,93,122,.09)]" style={{ width: `${(a.q / book.max) * 100}%` }} />
                    <span className="relative num text-[#ff8fa3]">{fmtMoney(a.p, region)}</span>
                    <span className="relative num text-muted">{a.q}</span>
                  </div>
                ))}
                <div className="my-1 flex items-center justify-between border-y border-white/[0.06] px-1.5 py-1">
                  <span className="num text-[11px] font-semibold">{fmtMoney(priceLocal, region)}</span>
                  <span className="text-[8.5px] uppercase tracking-wide text-muted">last</span>
                </div>
                {book.bids.map((b, i) => (
                  <div key={`b-${i}`} className="relative flex items-center justify-between px-1.5 py-[3px] text-[9.5px]">
                    <div className="absolute inset-y-[1px] right-0 rounded-sm bg-[rgba(47,227,160,.09)]" style={{ width: `${(b.q / book.max) * 100}%` }} />
                    <span className="relative num text-[#5beeb9]">{fmtMoney(b.p, region)}</span>
                    <span className="relative num text-muted">{b.q}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] p-3.5">
                <SectionHead title="Recent fills" subtitle="Your last executions" />
                <Link href="/portfolio" className="-my-2 shrink-0 px-1.5 py-2 text-[10px] font-semibold text-[#5beeb9] hover:underline">All</Link>
              </div>
              <div className="flex-1 divide-y divide-white/[0.04]">
                {orders.slice(0, 7).map((o) => (
                  <div key={o.id} className="flex items-center gap-2 px-3.5 py-2">
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[8px] font-bold",
                      o.side === "BUY" ? "bg-[rgba(47,227,160,.1)] text-[#5beeb9]" : "bg-[rgba(255,93,122,.1)] text-[#ff8fa3]")}>
                      {o.side === "BUY" ? "B" : "S"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[10px] font-semibold">{o.symbol} <span className="font-normal text-muted">×{fmtQty(o.qty)}</span></div>
                      <div className="text-[8.5px] text-muted">{new Date(o.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · {o.source}</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-[9.5px]">{fmtMoney(o.executed_price, region)}</div>
                      <div className="num text-[8px] text-muted">fee {fmtMoney(o.fee, region)}</div>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div className="p-6 text-center text-[10.5px] text-muted">No fills yet. Place your first simulated order.</div>}
              </div>
            </Card>
          </div>
        </div>

        {/* ticket column */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] p-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold">Order ticket</div>
                <Badge tone={bucket === "crypto" ? "red" : "green"}>{bucket === "crypto" ? "crypto sandbox" : "main account"}</Badge>
              </div>
              <div className="mt-1 text-[9.5px] text-muted">Available {fmtMoney(available, region)}</div>
            </div>

            {!verified && (
              <div className="flex flex-wrap items-center gap-2 border-b border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.06)] px-4 py-2.5">
                <ShieldCheck size={13} className="shrink-0 text-[#ffd08d]" />
                <span className="text-[10.5px] leading-relaxed text-[#ffd08d]">
                  Verify your ID to place orders.
                </span>
                <Link href="/verify" className="btn btn-dark btn-sm ml-auto">
                  Verify <ArrowUpRight size={12} />
                </Link>
              </div>
            )}

            <div className="p-4">
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-1">
                <button onClick={() => setSide("BUY")}
                  className={cn("h-9 rounded-lg text-[12px] font-bold transition", side === "BUY" ? "bg-[rgba(47,227,160,.14)] text-[#5beeb9] shadow-sm" : "text-muted hover:text-ink")}>
                  Buy
                </button>
                <button onClick={() => setSide("SELL")}
                  className={cn("h-9 rounded-lg text-[12px] font-bold transition", side === "SELL" ? "bg-[rgba(255,93,122,.14)] text-[#ff8fa3] shadow-sm" : "text-muted hover:text-ink")}>
                  Sell
                </button>
              </div>

              <div className="mt-3 flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-1">
                <span className="flex-1 rounded-md bg-white/[0.08] py-1.5 text-center text-[10px] font-semibold">Market</span>
                <span className="flex-1 py-1.5 text-center text-[10px] text-muted/50">Limit · soon</span>
                <span className="flex-1 py-1.5 text-center text-[10px] text-muted/50">Stop · soon</span>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label className="label">Quantity</label>
                  <span className="mb-1.5 text-[9px] text-muted">max {fmtQty(maxQty)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setQty((q) => String(Math.max(0, (Number(q) || 0) - 1)))} className="btn btn-dark h-11 w-11 shrink-0 px-0"><Minus size={13} /></button>
                  <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className="input h-11 text-center text-[15px] font-semibold" />
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
                  ["Screen price", fmtMoney(priceLocal, region)],
                  ["Est. fill", estimate ? fmtMoney(estimate.executedLocal, region) : "—"],
                  ["Notional", estimate ? fmtMoney(estimate.notional, region) : "—"],
                  ["Brokerage", estimate ? fmtMoney(estimate.fee, region) : "—"],
                  ["Slippage", estimate ? fmtMoney(estimate.slippage, region) : "—"],
                  ["Tax", estimate ? fmtMoney(estimate.tax, region) : "—"],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted">{l}</span>
                    <span className="num font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-1.5 text-[11.5px]">
                  <span className="text-muted">{side === "BUY" ? "Total debit" : "Net proceeds"}</span>
                  <span className={cn("num font-semibold", side === "BUY" ? "text-ink" : "text-[#5beeb9]")}>{estimate ? fmtMoney(estimate.total, region) : "—"}</span>
                </div>
              </div>

              {verified ? (
                <button onClick={submit} disabled={submitting || !estimate}
                  className={cn("btn mt-3 h-11 w-full", side === "BUY" ? "btn-primary" : "btn-danger")}>
                  {submitting ? "Placing order…" : `${side === "BUY" ? "Buy" : "Sell"} ${symbol}`}
                </button>
              ) : (
                <Link href="/verify" className="btn btn-primary mt-3 h-11 w-full">
                  <ShieldCheck size={14} /> Verify identity to trade
                </Link>
              )}
              <p className="mt-2 text-center text-[9px] text-muted/60">Simulated order · no real capital at risk</p>
            </div>
          </Card>

          {holding && (
            <Card className="p-4">
              <SectionHead title="Your position" subtitle={asset.name} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted">Quantity</div>
                  <div className="num mt-1 text-[13px] font-semibold">{fmtQty(holding.qty)}</div>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted">Avg cost</div>
                  <div className="num mt-1 text-[13px] font-semibold">{fmtMoney(holding.avgLocal, region)}</div>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted">Market value</div>
                  <div className="num mt-1 text-[13px] font-semibold">{fmtMoney(priceLocal * holding.qty, region)}</div>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted">Unrealised</div>
                  <div className={cn("num mt-1 text-[13px] font-semibold", priceLocal >= holding.avgLocal ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                    {fmtMoney((priceLocal - holding.avgLocal) * holding.qty, region)}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] p-3.5">
              <SectionHead title="Watchlist" subtitle="Quick switch" />
              <Layers size={13} className="text-muted" />
            </div>
            <div className="divide-y divide-white/[0.04]">
              {watch.map((s) => {
                const a = assets.find((x) => x.symbol === s);
                if (!a) return null;
                const t = prices[s];
                const c = t?.chg ?? (a.prev_close ? ((a.price - a.prev_close) / a.prev_close) * 100 : 0);
                return (
                  <button key={s} onClick={() => setSymbol(s)}
                    className={cn("flex w-full items-center gap-2 px-3.5 py-2 text-left transition hover:bg-white/[0.03]", s === symbol && "bg-[rgba(47,227,160,.04)]")}>
                    <span className="w-[76px] shrink-0 text-[10px] font-semibold">{s}</span>
                    <span className="num flex-1 text-right text-[9.5px] text-muted">{fmtMoney(toLocal(t?.p ?? a.price, region), region, true)}</span>
                    <span className={cn("num w-[48px] text-right text-[9px] font-semibold", c >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>{fmtPct(c)}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
            <Info size={12} className="mt-0.5 shrink-0 text-muted" />
            <p className="text-[9.5px] leading-relaxed text-muted">
              Orders execute instantly at the live simulated price with slippage. Crypto trades settle in the isolated sandbox bucket.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
