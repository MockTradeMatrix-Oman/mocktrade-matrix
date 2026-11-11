"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, BrainCircuit, Building2, Check,
  Cpu, Crown, GraduationCap, Layers, LineChart, Lock, Mail, Menu, Rocket, Shield,
  ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp, Trophy, Users, Wallet, Workflow, X, Zap,
} from "lucide-react";
import { Wordmark } from "./logo";
import { Sparkline } from "./charts";
import { Badge, cn } from "./ui";
import { CLASS_META, MODES, fmtMoney, fmtPct, toLocal } from "@/lib/finance";
import { institutionEmail } from "@/lib/contact";
import {
  FREE_FEATURES, INSTITUTION_FEATURES, PREMIUM_FEATURES, PREMIUM_MONTH_CREDITS, PREMIUM_SHIPPING,
} from "@/lib/plans-copy";

export type LandingAsset = {
  symbol: string;
  name: string;
  class: string;
  region: string;
  price: number;
  prev_close: number;
  esg: number;
  spark: number[];
};

export type LandingForecast = {
  symbol: string;
  direction: string;
  confidence: number;
  start_price: number;
  target_price: number;
};

export type LandingModule = {
  title: string;
  level: string;
  reward_credits: number;
};

const CLASSES = [
  {
    id: "stock",
    title: "Stocks",
    copy: "Direct equity in Indian and US companies, priced in your local currency with real intraday noise.",
    points: ["16 listed companies", "India + US exchanges", "Sector & ESG tags"],
  },
  {
    id: "fund",
    title: "Mutual funds",
    copy: "Professionally managed baskets. Learn why expense ratios and turnover quietly eat returns.",
    points: ["4 fund strategies", "Low to high volatility", "Fund-level fee model"],
  },
  {
    id: "etf",
    title: "ETFs",
    copy: "Index and thematic baskets that trade like a single stock — the cheapest route to diversification.",
    points: ["4 indexed baskets", "Gold hedge included", "ESG screening"],
  },
  {
    id: "insurance",
    title: "Insurance",
    copy: "Protection, not investment. Model premiums, deductibles and cover limits as a risk transfer.",
    points: ["Life · health · term", "Smoothed return profile", "Protection mechanics"],
  },
  {
    id: "crypto",
    title: "Crypto sandbox",
    copy: "A deliberately isolated, high-volatility sandbox so speculative capital can never eat your core portfolio.",
    points: ["4 digital assets", "Separate cash bucket", "50% drawdowns are normal"],
  },
];

const FRICTION = [
  { label: "Brokerage", value: "0.20% – 1.00%", note: "Charged on every fill, buy or sell, with a regional minimum." },
  { label: "Slippage", value: "0.06% – 0.50%", note: "Execution drifts against you. Thin books cost more." },
  { label: "Capital gains tax", value: "15% – 30%", note: "Applied on realised profit, not paper gains." },
  { label: "FX conversion", value: "₹83.20 / $1", note: "USD-quoted assets are converted into your home currency." },
];

const COMPARE = [
  ["Real trading friction", true, false, false],
  ["Guardian verification for minors", true, false, false],
  ["Forced 50% crash drill", true, false, false],
  ["AI trend forecasts with public accuracy", true, false, false],
  ["IF / ELSE rule builder", true, false, true],
  ["Institution classrooms & cohorts", true, false, true],
  ["Zero real capital at risk", true, true, true],
] as const;

function useNavScroll() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function LiveTape({ assets, region }: { assets: LandingAsset[]; region: string }) {
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(assets.map((a) => [a.symbol, a.price]))
  );

  useEffect(() => {
    let alive = true;
    async function pull() {
      try {
        const res = await fetch("/api/market/tape", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive || !Array.isArray(data.assets)) return;
        setPrices((prev) => {
          const next = { ...prev };
          for (const a of data.assets) next[a.symbol] = a.price;
          return next;
        });
      } catch {
        /* keep the last known tape */
      }
    }
    const id = setInterval(pull, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const rows = useMemo(() => {
    const order = ["NVDA", "RELIANCE", "BTC", "AAPL", "ETF_NIFTY50", "TSLA"];
    const map = new Map(assets.map((a) => [a.symbol, a]));
    return order.map((s) => map.get(s)).filter(Boolean) as LandingAsset[];
  }, [assets]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-10 rounded-[36px]" style={{ background: "radial-gradient(circle at 70% 20%, rgba(47,227,160,.13), transparent 65%)" }} />
      <div className="card relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.08)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#5beeb9]">
              <span className="h-1 w-1 animate-pulse-soft rounded-full bg-[#2fe3a0]" /> live tape
            </span>
            <span className="text-[9.5px] text-muted">Simulated market</span>
          </div>
          <span className="text-[9.5px] text-muted">{region === "IN" ? "IN · ₹ INR" : "US · $ USD"}</span>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="num text-[24px] font-semibold leading-none tracking-tight">{assets.length} instruments</div>
              <div className="mt-1.5 text-[10px] text-muted">Real prices from the simulation engine, refreshed every few seconds.</div>
            </div>
            <span className="chip chip-green">5 asset classes</span>
          </div>

          <div className="mt-4 divide-y divide-white/[0.04] border-t border-white/[0.06]">
            {rows.map((a) => {
              const price = prices[a.symbol] ?? a.price;
              const chg = a.prev_close ? ((price - a.prev_close) / a.prev_close) * 100 : 0;
              const up = chg >= 0;
              return (
                <div key={a.symbol} className="flex items-center gap-3 py-2.5">
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[8.5px] font-bold",
                    up ? "border-[rgba(47,227,160,.18)] bg-[rgba(47,227,160,.07)] text-[#5beeb9]" : "border-[rgba(255,93,122,.18)] bg-[rgba(255,93,122,.07)] text-[#ff8fa3]")}>
                    {a.symbol.slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-semibold">{a.symbol}</div>
                    <div className="truncate text-[9px] text-muted">{a.name}</div>
                  </div>
                  <Sparkline data={a.spark} width={54} height={22} tone={up ? "green" : "red"} fill={false} strokeWidth={1.4} />
                  <div className="w-[86px] text-right">
                    <div className="num text-[11px] font-medium">{fmtMoney(toLocal(price, region), region)}</div>
                    <div className={cn("num text-[9px] font-semibold", up ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>{fmtPct(chg)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/20 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-[9.5px] text-muted"><ShieldCheck size={11} className="text-[#5beeb9]" /> No real money at risk</span>
          <span className="flex items-center gap-1.5 text-[9.5px] text-muted"><Zap size={11} className="text-[#ffd08d]" /> Guardian-verified</span>
        </div>
      </div>
    </div>
  );
}

function TickerStrip({ assets, region }: { assets: LandingAsset[]; region: string }) {
  const items = [...assets, ...assets];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-black/25">
      <div className="ticker-track">
        {items.map((a, i) => {
          const chg = a.prev_close ? ((a.price - a.prev_close) / a.prev_close) * 100 : 0;
          const up = chg >= 0;
          return (
            <div key={`${a.symbol}-${i}`} className="flex shrink-0 items-center gap-2 border-r border-white/[0.04] px-4 py-2.5 text-[10.5px]">
              <span className="font-semibold text-[#c9d2e2]">{a.symbol}</span>
              <span className="num text-muted">{fmtMoney(toLocal(a.price, region), region, true)}</span>
              <span className={cn("num text-[9.5px] font-semibold", up ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>{fmtPct(chg)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Landing({
  assets,
  region = "IN",
  accuracy,
  modules,
  quizCount,
  forecasts,
  ladder,
}: {
  assets: LandingAsset[];
  region?: string;
  accuracy: number;
  modules: number;
  quizCount: number;
  forecasts: LandingForecast[];
  ladder: LandingModule[];
}) {
  const scrolled = useNavScroll();
  const [open, setOpen] = useState(false);
  const top = assets.slice(0, 12);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[560px]" style={{ background: "radial-gradient(60% 100% at 50% -20%, rgba(47,227,160,.13), transparent 70%)" }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] grid-bg opacity-40" />

      {/* nav */}
      <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled ? "border-b border-white/[0.06] bg-[#06080d]/85 backdrop-blur-xl" : "")}>
        <div className="mx-auto flex h-[66px] max-w-[1180px] items-center gap-6 px-5">
          <Link href="/" className="shrink-0"><Wordmark /></Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {[
              ["Universe", "#universe"],
              ["Learner modes", "#modes"],
              ["How it works", "#friction"],
              ["Pricing", "/pricing"],
              ["Developers", "/developers"],
            ].map(([label, href]) => (
              <a key={label} href={href} className="rounded-lg px-3 py-2 text-[12.5px] font-medium text-muted transition hover:bg-white/[0.04] hover:text-ink">{label}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="hidden text-[12.5px] font-medium text-muted transition hover:text-ink sm:block">Sign in</Link>
            <Link href="/signup" className="btn btn-primary btn-sm hidden sm:inline-flex">Get started <ArrowRight size={13} /></Link>
            <button onClick={() => setOpen((v) => !v)} className="rounded-lg border border-white/10 p-2 text-muted lg:hidden" aria-label="Menu">
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
        {open && (
          <div className="animate-fade-in border-t border-white/[0.06] bg-[#080b12] px-5 py-3 lg:hidden">
            {[["Universe", "#universe"], ["Learner modes", "#modes"], ["How it works", "#friction"], ["Pricing", "/pricing"], ["Developers", "/developers"]].map(([label, href]) => (
              <a key={label} href={href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-[13px] text-muted hover:bg-white/[0.04] hover:text-ink">{label}</a>
            ))}
            <Link href="/login" className="mt-1 block rounded-lg px-3 py-2.5 text-[13px] text-muted hover:bg-white/[0.04] hover:text-ink">Sign in</Link>
          </div>
        )}
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-5 pb-14 pt-[118px] sm:pt-[132px]">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.06fr_.94fr]">
          <div className="min-w-0 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-3">
              <span className="rounded-full bg-[rgba(47,227,160,.14)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#5beeb9]">New</span>
              <span className="text-[10.5px] text-muted">Guardian-verified financial literacy · India &amp; US</span>
            </div>

            <h1 className="mt-5 text-[40px] font-semibold leading-[1.03] tracking-[-0.04em] sm:text-[54px] xl:text-[62px]">
              Learn to lose.<br />
              <span className="relative inline-block text-[#2fe3a0] text-glow">
                Before it costs anything.
                <svg className="absolute -bottom-1 left-0 w-full" height="8" viewBox="0 0 300 8" fill="none" preserveAspectRatio="none">
                  <path d="M1 5.5C60 2 120 2 180 4.5C230 6.5 270 6 299 3.5" stroke="#2fe3a0" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="mt-5 max-w-[520px] text-[14px] leading-relaxed text-muted sm:text-[15px]">
              A guardian-verified, AI-powered investment simulation. Five asset classes, real brokerage, real tax,
              real slippage, and a forced 50% crash drill — all with zero real capital at risk.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start free with 100 credits <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn btn-ghost btn-lg">
                <Sparkles size={15} className="text-[#ffd08d]" /> Sign in to your account
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] text-muted">
              <span className="flex items-center gap-1.5"><Check size={12} className="text-[#5beeb9]" /> No card required</span>
              <span className="flex items-center gap-1.5"><Check size={12} className="text-[#5beeb9]" /> Under-18 guardian flow</span>
              <span className="flex items-center gap-1.5"><Check size={12} className="text-[#5beeb9]" /> Real-time engine</span>
            </div>
          </div>

          <div className="min-w-0 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <LiveTape assets={assets} region={region} />
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: `${assets.length}`, label: "live instruments", icon: LineChart },
            { value: "5", label: "asset classes", icon: Layers },
            { value: `${modules}`, label: "learning modules", icon: GraduationCap },
            { value: accuracy > 0 ? `${accuracy.toFixed(1)}%` : "live", label: "AI forecast accuracy", icon: BrainCircuit },
          ].map((s) => (
            <div key={s.label} className="card-soft flex items-center gap-3 p-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-[#5beeb9]"><s.icon size={15} /></span>
              <div>
                <div className="num text-[19px] font-semibold leading-none">{s.value}</div>
                <div className="mt-1 text-[9.5px] uppercase tracking-[0.1em] text-muted">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="relative z-10"><TickerStrip assets={top} region={region} /></div>

      {/* problem */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <div className="eyebrow">The problem</div>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[38px]">
              Most people meet their first real drawdown with real money.
            </h2>
            <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-muted">
              Financial literacy is taught as vocabulary — bull, bear, P/E — and tested with multiple choice.
              It is almost never taught as behaviour under pressure. MockTrade Matrix is built around that gap.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="green"><Shield size={10} /> Guardian verification</Badge>
              <Badge tone="violet"><Cpu size={10} /> Real-time engine</Badge>
              <Badge tone="amber"><Target size={10} /> Behaviour first</Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: TrendingDown, title: "Paper trading feels safe", body: "Static prices and no fees teach a version of investing that does not exist.", tone: "red" },
              { icon: Wallet, title: "Friction is invisible", body: "Brokerage, slippage and tax quietly turn a winning strategy into a losing one.", tone: "amber" },
              { icon: BrainCircuit, title: "AI is a black box", body: "Forecasts are sold with no public track record. Here accuracy is always on screen.", tone: "violet" },
              { icon: Users, title: "Minors are locked out", body: "No structured, guardian-approved path for learners under eighteen.", tone: "cyan" },
            ].map((c) => (
              <div key={c.title} className="card card-hover p-4">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl border",
                  c.tone === "red" ? "border-[rgba(255,93,122,.2)] bg-[rgba(255,93,122,.08)] text-[#ff8fa3]"
                    : c.tone === "amber" ? "border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.08)] text-[#ffd08d]"
                    : c.tone === "violet" ? "border-[rgba(139,123,255,.2)] bg-[rgba(139,123,255,.08)] text-[#b3a8ff]"
                    : "border-[rgba(76,201,240,.2)] bg-[rgba(76,201,240,.08)] text-[#7fdcff]")}>
                  <c.icon size={16} />
                </span>
                <div className="mt-3 text-[13px] font-semibold">{c.title}</div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* universe */}
      <section id="universe" className="relative z-10 border-y border-white/[0.055] bg-[#070a10]/60">
        <div className="mx-auto max-w-[1180px] px-5 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow">The universe</div>
              <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] sm:text-[38px]">Five asset classes. One honest tape.</h2>
              <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-muted">
                Every instrument is quoted in USD and converted to your region. Crypto sits in an isolated sandbox
                so speculative capital can never quietly consume your education portfolio.
              </p>
            </div>
            <Link href="/markets" className="btn btn-ghost btn-sm">Explore the market <ArrowUpRight size={13} /></Link>
          </div>

          <div className="mt-9 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {CLASSES.map((c, i) => {
              const meta = CLASS_META[c.id];
              const inClass = assets.filter((a) => a.class === c.id).slice(0, 4);
              return (
                <div key={c.id} className={cn("card card-hover flex flex-col p-5", i === 0 && "xl:row-span-2")}>
                  <div className="flex items-center justify-between">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl border text-[10px] font-bold",
                      c.id === "stock" ? "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.08)] text-[#5beeb9]"
                        : c.id === "fund" ? "border-[rgba(139,123,255,.2)] bg-[rgba(139,123,255,.08)] text-[#b3a8ff]"
                        : c.id === "etf" ? "border-[rgba(76,201,240,.2)] bg-[rgba(76,201,240,.08)] text-[#7fdcff]"
                        : c.id === "insurance" ? "border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.08)] text-[#ffd08d]"
                        : "border-[rgba(255,93,122,.2)] bg-[rgba(255,93,122,.08)] text-[#ff8fa3]")}>
                    {meta?.short ?? "MT"}
                  </span>
                  <span className="text-[9.5px] text-muted">{assets.filter((a) => a.class === c.id).length} instruments</span>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{c.copy}</p>
                <ul className="mt-3 space-y-1.5">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-center gap-1.5 text-[10.5px] text-[#b9c2d2]">
                      <Check size={10} className="shrink-0 text-[#5beeb9]" /> {p}
                    </li>
                  ))}
                </ul>
                {inClass.length > 0 && (
                  <div className="mt-4 space-y-1.5 border-t border-white/[0.05] pt-3">
                    {inClass.map((a) => {
                      const chg = a.prev_close ? ((a.price - a.prev_close) / a.prev_close) * 100 : 0;
                      return (
                        <div key={a.symbol} className="flex items-center gap-2">
                          <span className="w-[74px] shrink-0 truncate text-[9.5px] font-semibold text-[#c9d2e2]">{a.symbol}</span>
                          <Sparkline data={a.spark} width={44} height={16} tone={chg >= 0 ? "green" : "red"} fill={false} strokeWidth={1.3} />
                          <span className="ml-auto num text-[9.5px] text-muted">{fmtMoney(toLocal(a.price, region), region, true)}</span>
                          <span className={cn("num w-[52px] text-right text-[9px] font-semibold", chg >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>{fmtPct(chg)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </section>

      {/* modes */}
      <section id="modes" className="relative z-10 mx-auto max-w-[1180px] px-5 py-20">
        <div className="text-center">
          <div className="eyebrow">Six ways in</div>
          <h2 className="mx-auto mt-3 max-w-2xl text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[38px]">
            One platform, six learner modes.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[13px] leading-relaxed text-muted">
            A 15-year-old in a classroom and a programmer building IF/ELSE strategies need different surfaces.
            Pick a mode — the workspace adapts.
          </p>
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m, i) => {
            const icons = [GraduationCap, Rocket, Target, Workflow, BarChart3, Building2];
            const tones = ["emerald", "violet", "amber", "cyan", "emerald", "violet"];
            const Icon = icons[i];
            return (
              <div key={m.id} className="card card-hover group p-5">
                <div className="flex items-center justify-between">
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl border",
                    tones[i] === "emerald" ? "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.08)] text-[#5beeb9]"
                      : tones[i] === "violet" ? "border-[rgba(139,123,255,.2)] bg-[rgba(139,123,255,.08)] text-[#b3a8ff]"
                      : tones[i] === "amber" ? "border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.08)] text-[#ffd08d]"
                      : "border-[rgba(76,201,240,.2)] bg-[rgba(76,201,240,.08)] text-[#7fdcff]")}>
                    <Icon size={17} />
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted/60">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-[14px] font-semibold">{m.name}</h3>
                <div className="mt-0.5 text-[10px] font-medium text-[#5beeb9]/80">{m.tagline}</div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{m.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* progression */}
      <section className="relative z-10 border-y border-white/[0.055] bg-[#070a10]/60">
        <div className="mx-auto max-w-[1180px] px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
            <div>
              <div className="eyebrow">Progression</div>
              <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[38px]">
                Credits are earned, never bought.
              </h2>
              <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-muted">
                Pass a module quiz to earn credits. Spend credits to unlock the next module. Trade well and earn
                XP on the same ladder. Nothing here can be purchased with real money.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  { icon: GraduationCap, title: "Learn the mechanism", body: `${modules} modules, ${quizCount} questions, from money and risk to algorithmic thinking.` },
                  { icon: Zap, title: "Earn credits", body: "A perfect score pays the full reward. A pass still pays 60%." },
                  { icon: Lock, title: "Unlock the next rung", body: "Advanced modules cost credits — attention is the currency." },
                  { icon: Trophy, title: "Climb the ladder", body: "XP, streak and portfolio return all feed your public rank." },
                ].map((s, i) => (
                  <div key={s.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#5beeb9]"><s.icon size={14} /></span>
                      {i < 3 && <span className="mt-1 h-full w-px bg-white/[0.07]" />}
                    </div>
                    <div className="pb-1">
                      <div className="text-[12.5px] font-semibold">{s.title}</div>
                      <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
                <div>
                  <div className="text-[12px] font-semibold">Learning ladder</div>
                  <div className="text-[9.5px] text-muted">Two paths in. One destination.</div>
                </div>
                <Badge tone="amber"><Zap size={10} /> 100 starting credits</Badge>
              </div>
              <div className="p-4">
                <div className="space-y-1">
                  {ladder.map((m, i) => {
                    const unlocked = i === 0;
                    return (
                      <div key={m.title} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5",
                        unlocked ? "border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.05)]" : "border-transparent")}>
                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                          unlocked ? "border-[rgba(255,192,97,.4)] bg-[rgba(255,192,97,.12)] text-[#ffd08d]"
                            : "border-white/[0.08] bg-[#0b0f17] text-muted/50")}>
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className={cn("truncate text-[11.5px] font-medium", !unlocked && "text-muted/60")}>{m.title}</div>
                          <div className="text-[9px] text-muted">{m.level} · {m.reward_credits} credits</div>
                        </div>
                        {unlocked ? <span className="chip chip-amber shrink-0">Start</span> : <Lock size={11} className="shrink-0 text-muted/40" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* friction */}
      <section id="friction" className="relative z-10 mx-auto max-w-[1180px] px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="card overflow-hidden">
              <div className="border-b border-white/[0.06] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-semibold">Order ticket · BUY 10 NVDA</div>
                    <div className="text-[9.5px] text-muted">Every cost is shown before you click.</div>
                  </div>
                  <Badge tone="red">Friction on</Badge>
                </div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {[
                  ["Market price", "₹11,498.24", "muted"],
                  ["Slippage · 0.18%", "−₹20.70", "red"],
                  ["Brokerage · 0.25%", "−₹287.46", "red"],
                  ["Notional", "₹1,14,982.40", "ink"],
                  ["Capital gains tax", "on sell only", "amber"],
                ].map(([label, value, tone]) => (
                  <div key={label as string} className="flex items-center justify-between px-4 py-2.5 text-[11px]">
                    <span className="text-muted">{label}</span>
                    <span className={cn("num font-semibold",
                      tone === "red" ? "text-[#ff8fa3]" : tone === "amber" ? "text-[#ffd08d]" : tone === "ink" ? "text-ink" : "text-muted")}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/20 px-4 py-3">
                <span className="text-[11px] text-muted">Total debit</span>
                <span className="num text-[14px] font-semibold">₹1,15,290.56</span>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="eyebrow">Real friction</div>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[38px]">
              The costs that decide whether you actually made money.
            </h2>
            <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-muted">
              A strategy that earns 0.4% per trade can be net-negative once brokerage and slippage are applied on
              both legs. This platform charges every one of them.
            </p>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {FRICTION.map((f) => (
                <div key={f.label} className="card-soft p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold text-[#c9d2e2]">{f.label}</span>
                    <span className="num text-[10.5px] font-semibold text-[#ffd08d]">{f.value}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-muted">{f.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* crash drill */}
      <section className="relative z-10 overflow-hidden border-y border-[rgba(255,93,122,.16)] bg-[#0b0709]">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(255,93,122,.1), transparent 70%)" }} />
        <div className="relative mx-auto max-w-[1180px] px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <div className="eyebrow !text-[#ff8fa3]/70">Recurring training</div>
              <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[38px]">
                A forced 50% crash, whether you are ready or not.
              </h2>
              <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-[#c9a9b1]">
                Every learner experiences a simulated market-wide drawdown. Drills land at random, roughly every
                2 days to 2 weeks, with no fixed schedule. The first time you meet a crash should never be with real money.
              </p>
              <div className="mt-6 space-y-2.5">
                {[
                  ["20-second warning", "The tape tells you it is coming. Your reaction is the lesson."],
                  ["Every asset repriced 50% lower", "Portfolio marked down with the market, in real time."],
                  ["A 6-minute recovery window", "Prices drift back up. Watch how it feels."],
                ].map(([t, b]) => (
                  <div key={t} className="flex items-start gap-2.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5d7a]" />
                    <div>
                      <div className="text-[11.5px] font-semibold text-[#f2dde1]">{t}</div>
                      <div className="text-[10.5px] text-[#a9909a]">{b}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(255,93,122,.22)] bg-[rgba(255,93,122,.05)] p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff8fa3]">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[#ff5d7a]" /> crash drill · illustrative
              </div>
              <div className="mt-4 flex items-end gap-3">
                <div className="num text-[52px] font-semibold leading-none text-[#ff8fa3]">−50%</div>
                <div className="mb-1.5 text-[11px] font-semibold text-[#ffb3c0]">simulated drawdown</div>
              </div>
              <div className="mt-5 space-y-2.5">
                {[["RELIANCE", "₹2,861 → ₹1,430"], ["NVDA", "₹11,498 → ₹5,749"], ["BTC", "₹56,92,544 → ₹28,46,272"]].map(([s, p]) => (
                  <div key={s} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-black/25 px-3 py-2">
                    <span className="text-[10.5px] font-semibold text-[#d8c2c7]">{s}</span>
                    <span className="num text-[10px] text-[#a9909a]">{p}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[9.5px] text-[#a9909a]">
                  <span>Recovery window</span><span className="num">6:00</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-[#ff5d7a] to-[#ff9db0]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ai + rules */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-5 py-20">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(139,123,255,.2)] bg-[rgba(139,123,255,.08)] text-[#b3a8ff]"><BrainCircuit size={16} /></span>
              <div>
                <div className="text-[13px] font-semibold">AI trend forecasts</div>
                <div className="text-[9.5px] uppercase tracking-[0.12em] text-muted">LSTM ensemble · 1D horizon</div>
              </div>
              <Badge tone="violet" className="ml-auto">{accuracy > 0 ? `${accuracy.toFixed(1)}% accuracy` : "building record"}</Badge>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-muted">
              Forecasts publish continuously across the universe and resolve after 90 seconds. Every prediction is
              stored, scored and shown publicly — you can audit the model instead of trusting a screenshot.
            </p>
            <div className="mt-4 space-y-2">
              {forecasts.length ? forecasts.map((f) => {
                const up = f.direction === "bullish";
                const down = f.direction === "bearish";
                return (
                  <div key={f.symbol} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                    <span className="w-[74px] shrink-0 text-[11px] font-semibold">{f.symbol}</span>
                    <span className={cn("chip shrink-0", up ? "chip-green" : down ? "chip-red" : "")}>
                      {up ? <TrendingUp size={9} /> : down ? <TrendingDown size={9} /> : <Target size={9} />} {f.direction}
                    </span>
                    <span className="num shrink-0 text-[10px] font-semibold text-[#b3a8ff]">{(f.confidence * 100).toFixed(1)}%</span>
                    <span className="num ml-auto shrink-0 text-[9.5px] text-muted">
                      {fmtMoney(toLocal(f.start_price, region), region)} → {fmtMoney(toLocal(f.target_price, region), region)}
                    </span>
                  </div>
                );
              }) : (
                <div className="rounded-xl border border-dashed border-white/[0.07] px-3 py-4 text-center text-[10.5px] text-muted">
                  The forecast feed fills in as soon as the simulation engine starts.
                </div>
              )}
            </div>
          </div>

          <div className="card relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(76,201,240,.12), transparent 65%)" }} />
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(76,201,240,.2)] bg-[rgba(76,201,240,.08)] text-[#7fdcff]"><Workflow size={16} /></span>
              <div>
                <div className="text-[13px] font-semibold">IF / ELSE rule builder</div>
                <div className="text-[9.5px] uppercase tracking-[0.12em] text-muted">No code required</div>
              </div>
              <Badge className="ml-auto">Shipping next</Badge>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-muted">
              Turn a hunch into machine-checkable logic: conditions, sizing, exits. Rules execute against the live
              simulated tape and report every trigger.
            </p>
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#060a11] p-4 font-mono text-[10.5px] leading-relaxed">
              <div className="text-muted/60">// rule: momentum-entry</div>
              <div className="mt-1"><span className="text-[#b3a8ff]">IF</span> <span className="text-[#7fdcff]">rsi</span> &lt; <span className="text-[#ffd08d]">70</span></div>
              <div className="pl-4"><span className="text-[#b3a8ff]">AND</span> <span className="text-[#7fdcff]">sma20</span> &gt; <span className="text-[#7fdcff]">sma50</span></div>
              <div className="pl-4"><span className="text-[#b3a8ff]">AND</span> <span className="text-[#7fdcff]">sentiment</span> &gt; <span className="text-[#ffd08d]">0.15</span></div>
              <div className="mt-1"><span className="text-[#b3a8ff]">THEN</span> BUY <span className="text-[#ffd08d]">10</span> NVDA</div>
              <div><span className="text-[#b3a8ff]">STOP</span> at <span className="text-[#ff8fa3]">−3%</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="relative z-10 border-y border-white/[0.055] bg-[#070a10]/60">
        <div className="mx-auto max-w-[1180px] px-5 py-20">
          <div className="text-center">
            <div className="eyebrow">Pricing</div>
            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] sm:text-[38px]">Free to learn. Built to go deeper.</h2>
            <p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed text-muted">
              Every learner keeps the full simulation on Free. Premium adds the final exam, merit certificate,
              complete analytics and expert sessions. Institution adds the classroom layer.
            </p>
          </div>

          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            <div className="card p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Free</div>
              <div className="mt-3 flex items-end gap-1">
                <span className="num text-[34px] font-semibold leading-none">₹0</span>
                <span className="mb-1 text-[11px] text-muted">/ $0</span>
              </div>
              <p className="mt-2 text-[11px] text-muted">Everything the app has today. Forever, no card.</p>
              <ul className="mt-5 space-y-2">
                {FREE_FEATURES.slice(0, 5).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#b9c2d2]"><Check size={11} className="mt-0.5 shrink-0 text-[#5beeb9]" /> {f}</li>
                ))}
              </ul>
              <Link href="/signup" className="btn btn-ghost mt-6 w-full">Create free account <ArrowRight size={13} /></Link>
            </div>

            <div className="card relative overflow-hidden p-6 ring-1 ring-[rgba(47,227,160,.28)]">
              <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(47,227,160,.16), transparent 65%)" }} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5beeb9]">Premium</div>
                  <Badge tone="green">Investor beta</Badge>
                </div>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="num text-[34px] font-semibold leading-none">{PREMIUM_MONTH_CREDITS}</span>
                  <span className="mb-1 text-[11px] text-muted">credits / month</span>
                </div>
                <p className="mt-2 text-[11px] text-muted">30 days. Earned in Learning and the Arena, never bought with money.</p>
                <ul className="mt-5 space-y-2">
                  {PREMIUM_FEATURES.slice(1, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#b9c2d2]"><Check size={11} className="mt-0.5 shrink-0 text-[#5beeb9]" /> {f}</li>
                  ))}
                  <li className="flex items-start gap-2 text-[11px] leading-relaxed text-[#b9c2d2]">
                    <Sparkles size={11} className="mt-0.5 shrink-0 text-[#ffd08d]" />
                    <span>{PREMIUM_SHIPPING} <span className="ml-1 rounded bg-[rgba(255,192,97,.12)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#ffd08d]">Shipping next</span></span>
                  </li>
                </ul>
                <Link href="/pricing" className="btn btn-primary mt-6 w-full"><Crown size={14} /> Explore Premium</Link>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b3a8ff]">Institution</div>
                <Badge tone="violet"><Building2 size={9} /> Cohorts</Badge>
              </div>
              <div className="mt-3 flex items-end gap-1.5">
                <span className="text-[27px] font-semibold leading-none">Custom quote</span>
              </div>
              <p className="mt-2 text-[11px] text-muted">Per cohort. Sized with you, not a checkout.</p>
              <ul className="mt-5 space-y-2">
                {INSTITUTION_FEATURES.slice(1, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#b9c2d2]"><Check size={11} className="mt-0.5 shrink-0 text-[#b3a8ff]" /> {f}</li>
                ))}
              </ul>
              <a href={institutionEmail("/#pricing")} target="_blank" rel="noopener noreferrer" className="btn btn-dark mt-6 w-full">
                <Mail size={14} /> Talk to us
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[10.5px] text-muted">
            <span className="flex items-center gap-1.5"><ShieldCheck size={11} className="text-[#5beeb9]" /> No card payments processed</span>
            <span className="text-muted/30">·</span>
            <span>Credits never convert to cash</span>
            <span className="text-muted/30">·</span>
            <Link href="/pricing" className="inline-flex items-center gap-1 font-semibold text-[#8df5d0] hover:underline">Compare all plans <ArrowRight size={11} /></Link>
          </div>
        </div>
      </section>

      {/* comparison */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-5 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Comparison</div>
            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] sm:text-[38px]">Not another paper-trading toy.</h2>
          </div>
          <span className="text-[10.5px] text-muted">Feature parity across the category</span>
        </div>

        <div className="card mt-7 overflow-hidden">
          <div className="grid grid-cols-[1.6fr_repeat(3,1fr)] border-b border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
            <span>Capability</span>
            <span className="text-center text-[#5beeb9]">MockTrade Matrix</span>
            <span className="text-center">Paper broker</span>
            <span className="text-center">Course platform</span>
          </div>
          {COMPARE.map(([label, a, b, c], i) => (
            <div key={label} className={cn("grid grid-cols-[1.6fr_repeat(3,1fr)] items-center px-4 py-3 text-[11px]", i % 2 === 1 && "bg-white/[0.012]")}>
              <span className="pr-3 text-[#c9d2e2]">{label}</span>
              {[a, b, c].map((v, j) => (
                <span key={j} className="flex justify-center">
                  {v ? <Check size={14} className={j === 0 ? "text-[#5beeb9]" : "text-muted/70"} /> : <X size={13} className="text-muted/30" />}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* sdg + cta */}
      <section className="relative z-10 border-t border-white/[0.055] bg-[#070a10]/60">
        <div className="mx-auto max-w-[1180px] px-5 py-16">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["SDG 4", "Quality education", "Financial literacy as a taught, measurable skill."],
              ["SDG 8", "Decent work & growth", "Better capital allocation starts with better habits."],
              ["SDG 12", "Responsible consumption", "Understanding friction before it consumes returns."],
            ].map(([tag, title, body]) => (
              <div key={tag} className="card-soft p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[rgba(47,227,160,.1)] px-1.5 py-0.5 text-[9px] font-bold text-[#5beeb9]">{tag}</span>
                  <span className="text-[11px] font-semibold">{title}</span>
                </div>
                <p className="mt-2 text-[10.5px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>

          <div className="card relative mt-6 overflow-hidden p-8 text-center sm:p-12">
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 100% at 50% 0%, rgba(47,227,160,.12), transparent 70%)" }} />
            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.08)]">
                <ShieldCheck size={22} className="text-[#5beeb9]" />
              </div>
              <h2 className="mx-auto mt-5 max-w-xl text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
                Your first crash should be a simulation.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[12.5px] leading-relaxed text-muted">
                Create an account, verify your guardian if you are under 18, and start with 100 credits. No card,
                no real capital, no pressure.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup" className="btn btn-primary btn-lg">Create free account <ArrowRight size={16} /></Link>
                <Link href="/login" className="btn btn-ghost btn-lg">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-white/[0.055]">
        <div className="mx-auto max-w-[1180px] px-5 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Wordmark />
              <p className="mt-3 max-w-[260px] text-[11px] leading-relaxed text-muted">
                A guardian-verified, AI-powered financial literacy and algorithmic investment simulation.
                Built for India and the United States.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[9.5px] text-muted/60">
                <BadgeCheck size={11} className="text-[#5beeb9]" /> Zero real capital at risk
              </div>
            </div>
            {[
              ["Product", [["Markets", "/markets"], ["Trade terminal", "/trade"], ["Learning ladder", "/learn"], ["Portfolio", "/portfolio"]]],
              ["Company", [["About", "/legal#about"], ["Roadmap", "/legal#roadmap"], ["Developers", "/developers"], ["Contact", "/legal#contact"]]],
              ["Legal", [["Simulation terms", "/legal#simulation-terms"], ["Privacy", "/legal#privacy"], ["Guardian policy", "/legal#guardian-policy"], ["Risk disclosure", "/legal#risk-disclosure"]]],
            ].map(([title, links]) => (
              <div key={title as string}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</div>
                <ul className="mt-3 space-y-2">
                  {(links as Array<[string, string]>).map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="text-[11px] text-muted transition hover:text-ink">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-5 text-[10px] text-muted/60">
            <span>© {new Date().getFullYear()} MockTrade Matrix. A simulation — not investment advice.</span>
            <span className="flex items-center gap-3">
              <span>SDG 4</span><span>SDG 8</span><span>SDG 12</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
