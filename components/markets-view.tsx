"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownUp, ArrowUpRight, Filter, Search, SlidersHorizontal, Sparkles, TrendingDown, TrendingUp,
} from "lucide-react";
import { Badge, Card, ChangePill, EmptyState, SectionHead, cn } from "./ui";
import { Sparkline } from "./charts";
import { useMarket } from "./socket";
import { CLASS_META, fmtMoney, fmtPct, toLocal } from "@/lib/finance";

export type MarketAsset = {
  symbol: string;
  name: string;
  class: string;
  region: string;
  sector: string | null;
  price: number;
  prev_close: number;
  sentiment: number;
  headline: string | null;
  esg: number;
  about: string | null;
  spark: number[];
};

const CLASS_TABS = [
  { id: "all", label: "All assets" },
  { id: "stock", label: "Stocks" },
  { id: "fund", label: "Funds" },
  { id: "etf", label: "ETFs" },
  { id: "insurance", label: "Insurance" },
  { id: "crypto", label: "Crypto" },
];

type SortKey = "name" | "price" | "change" | "sentiment" | "esg";

export function MarketsView({ assets, region }: { assets: MarketAsset[]; region: string }) {
  const { prices, headlines, connected } = useMarket();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [regionFilter, setRegionFilter] = useState<"all" | "IN" | "US" | "GLOBAL">("all");
  const [sort, setSort] = useState<SortKey>("change");
  const [asc, setAsc] = useState(false);
  const [view, setView] = useState<"table" | "cards">("table");

  const rows = useMemo(() => {
    const list = assets.map((a) => {
      const tick = prices[a.symbol];
      const price = tick?.p ?? a.price;
      const chg = tick?.chg ?? (a.prev_close ? ((a.price - a.prev_close) / a.prev_close) * 100 : 0);
      return {
        ...a,
        price,
        chg,
        sentiment: tick?.sent ?? a.sentiment,
        headline: headlines[a.symbol] ?? a.headline,
      };
    });
    const filtered = list.filter((a) => {
      if (tab !== "all" && a.class !== tab) return false;
      if (regionFilter !== "all" && a.region !== regionFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.sector ?? "").toLowerCase().includes(q);
    });
    filtered.sort((a, b) => {
      const dir = asc ? 1 : -1;
      switch (sort) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "price": return (a.price - b.price) * dir;
        case "sentiment": return (a.sentiment - b.sentiment) * dir;
        case "esg": return (a.esg - b.esg) * dir;
        default: return (a.chg - b.chg) * dir;
      }
    });
    return filtered;
  }, [assets, prices, headlines, tab, regionFilter, query, sort, asc]);

  const stats = useMemo(() => {
    const list = Object.values(prices);
    const adv = list.filter((p) => p.chg > 0).length;
    const dec = list.filter((p) => p.chg < 0).length;
    const avg = list.length ? list.reduce((s, p) => s + p.chg, 0) / list.length : 0;
    return { adv, dec, avg };
  }, [prices]);

  function toggleSort(key: SortKey) {
    if (sort === key) setAsc((v) => !v);
    else { setSort(key); setAsc(key === "name"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">Market universe</h1>
            <span className={cn("chip", connected ? "chip-green" : "chip-amber")}>
              <span className={cn("h-1 w-1 rounded-full", connected ? "bg-[#2fe3a0]" : "bg-[#ffc061]")} />
              {connected ? "live" : "reconnecting"}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            {assets.length} instruments across five asset classes. Switch between Indian and US markets, priced in {region === "IN" ? "INR" : "USD"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/trade" className="btn btn-primary btn-sm"><Sparkles size={13} /> Open terminal</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Instruments", value: assets.length.toString(), tone: "neutral" },
          { label: "Advancing", value: stats.adv.toString(), tone: "green" },
          { label: "Declining", value: stats.dec.toString(), tone: "red" },
          { label: "Average move", value: fmtPct(stats.avg), tone: stats.avg >= 0 ? "green" : "red" },
        ].map((s) => (
          <div key={s.label} className="card-soft p-3.5">
            <div className="text-[9.5px] uppercase tracking-[0.12em] text-muted">{s.label}</div>
            <div className={cn("num mt-1.5 text-[19px] font-semibold leading-none",
              s.tone === "green" ? "text-[#5beeb9]" : s.tone === "red" ? "text-[#ff8fa3]" : "text-ink")}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] p-3">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbol, name or sector…"
              className="input h-9 pl-9 text-[12px]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-lg border border-white/[0.06] bg-black/20 p-0.5">
            {CLASS_TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("shrink-0 rounded-md px-2.5 py-1.5 text-[10.5px] font-semibold transition",
                  tab === t.id ? "bg-white/[0.09] text-ink" : "text-muted hover:text-ink")}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-0.5">
            {([["all", "All"], ["IN", "India"], ["US", "United States"], ["GLOBAL", "Global"]] as const).map(([r, label]) => (
              <button key={r} onClick={() => setRegionFilter(r)}
                className={cn("shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition",
                  regionFilter === r ? "bg-white/[0.09] text-ink" : "text-muted hover:text-ink")}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => setView((v) => (v === "table" ? "cards" : "table"))}
            className="btn btn-dark btn-sm h-9" title="Toggle view">
            <SlidersHorizontal size={13} /> {view === "table" ? "Cards" : "Table"}
          </button>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<Filter size={18} />} title="No instruments match" body="Try a different search, class or region filter." />
        ) : view === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-[9.5px] uppercase tracking-[0.1em] text-muted">
                  <th className="px-4 py-2.5 font-semibold">
                    <button onClick={() => toggleSort("name")} className="-my-2 inline-flex items-center gap-1 py-2 hover:text-ink">Instrument <ArrowDownUp size={10} /></button>
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Class</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    <button onClick={() => toggleSort("price")} className="-my-2 inline-flex items-center gap-1 py-2 hover:text-ink">Price <ArrowDownUp size={10} /></button>
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    <button onClick={() => toggleSort("change")} className="-my-2 inline-flex items-center gap-1 py-2 hover:text-ink">24h <ArrowDownUp size={10} /></button>
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Trend</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    <button onClick={() => toggleSort("sentiment")} className="-my-2 inline-flex items-center gap-1 py-2 hover:text-ink">Sentiment <ArrowDownUp size={10} /></button>
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    <button onClick={() => toggleSort("esg")} className="-my-2 inline-flex items-center gap-1 py-2 hover:text-ink">ESG <ArrowDownUp size={10} /></button>
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const up = a.chg >= 0;
                  return (
                    <tr key={a.symbol} className="table-row border-b border-white/[0.035] last:border-0">
                      <td className="px-4 py-2.5">
                        <Link href={`/markets/${a.symbol}`} className="flex items-center gap-2.5 group">
                          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[8.5px] font-bold",
                            up ? "border-[rgba(47,227,160,.18)] bg-[rgba(47,227,160,.07)] text-[#5beeb9]" : "border-[rgba(255,93,122,.18)] bg-[rgba(255,93,122,.07)] text-[#ff8fa3]")}>
                            {a.symbol.slice(0, 3)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[11.5px] font-semibold group-hover:text-[#5beeb9]">{a.symbol}</span>
                            <span className="block truncate text-[9.5px] text-muted">{a.name}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-muted">
                          {CLASS_META[a.class]?.short ?? a.class}
                        </span>
                      </td>
                      <td className="num px-3 py-2.5 text-right text-[11.5px] font-medium">{fmtMoney(toLocal(a.price, region), region)}</td>
                      <td className="px-3 py-2.5 text-right"><ChangePill value={a.chg} showIcon /></td>
                      <td className="px-3 py-2.5">
                        <Sparkline data={a.spark} width={76} height={24} tone={up ? "green" : "red"} fill={false} strokeWidth={1.4} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold",
                          a.sentiment > 0.1 ? "text-[#5beeb9]" : a.sentiment < -0.1 ? "text-[#ff8fa3]" : "text-muted")}>
                          {a.sentiment > 0.1 ? <TrendingUp size={10} /> : a.sentiment < -0.1 ? <TrendingDown size={10} /> : null}
                          {a.sentiment > 0.35 ? "Very +" : a.sentiment > 0.1 ? "Positive" : a.sentiment < -0.35 ? "Very −" : a.sentiment < -0.1 ? "Negative" : "Neutral"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={cn("num text-[10px] font-semibold", a.esg >= 75 ? "text-[#5beeb9]" : a.esg >= 55 ? "text-[#ffd08d]" : "text-muted")}>{a.esg}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href={`/trade?symbol=${a.symbol}`} className="btn btn-dark btn-sm h-7 px-2.5 text-[10px]">Trade</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((a) => {
              const up = a.chg >= 0;
              return (
                <Link key={a.symbol} href={`/markets/${a.symbol}`} className="card-soft card-hover block p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl border text-[9px] font-bold",
                        up ? "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.08)] text-[#5beeb9]" : "border-[rgba(255,93,122,.2)] bg-[rgba(255,93,122,.08)] text-[#ff8fa3]")}>
                        {a.symbol.slice(0, 3)}
                      </span>
                      <div>
                        <div className="text-[12px] font-semibold">{a.symbol}</div>
                        <div className="text-[9.5px] text-muted">{a.name}</div>
                      </div>
                    </div>
                    <ChangePill value={a.chg} />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="num text-[18px] font-semibold leading-none">{fmtMoney(toLocal(a.price, region), region)}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-wide text-muted">{a.sector ?? CLASS_META[a.class]?.label}</div>
                    </div>
                    <Sparkline data={a.spark} width={96} height={34} tone={up ? "green" : "red"} strokeWidth={1.5} />
                  </div>
                  {a.headline && <div className="mt-3 line-clamp-2 border-t border-white/[0.05] pt-2.5 text-[9.5px] leading-relaxed text-muted">{a.headline}</div>}
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionHead title="How pricing works here" subtitle="One honest tape, no shortcuts" />
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            {[
              ["USD quoted", "Every asset is stored in USD and converted with a fixed FX rate for your region."],
              ["Live ticks", "Prices move every 1.5 seconds on a simulated order-flow engine."],
              ["Friction on", "Brokerage, slippage and tax apply on execution, not on screen price."],
            ].map(([t, b]) => (
              <div key={t} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="text-[10.5px] font-semibold text-[#c9d2e2]">{t}</div>
                <div className="mt-1 text-[9.5px] leading-relaxed text-muted">{b}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="flex flex-col justify-between p-4">
          <div>
            <div className="eyebrow">Ready to execute?</div>
            <div className="mt-1.5 text-[13px] font-semibold">Open the trade terminal</div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">See the full cost breakdown before you place a simulated order.</p>
          </div>
          <Link href="/trade" className="btn btn-primary btn-sm mt-3 w-full">Open terminal <ArrowUpRight size={13} /></Link>
        </Card>
      </div>
    </div>
  );
}
