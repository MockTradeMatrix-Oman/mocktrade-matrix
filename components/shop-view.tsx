"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight, CheckCircle2, Coins, Flame, Gift, Loader2, ShieldCheck, ShoppingBag, SkipForward,
  Snowflake, Sparkles, Swords, TrendingUp, Wallet, Zap,
} from "lucide-react";
import { Badge, Card, SectionHead, Stat, cn } from "./ui";
import { useToast } from "./toast";
import { useMarket } from "./socket";
import { fmtMoney, timeAgo } from "@/lib/finance";
import { SHOP_PACKS, packAmounts, type ShopPack } from "@/lib/shop";
import { POWERUP_LIST, type Powerup } from "@/lib/arena-catalog";

type ShopUser = {
  name: string;
  credits: number;
  cash: number;
  cryptoCash: number;
  startCapital: number;
  region: string;
  verified: boolean;
};

type Purchase = {
  id: number;
  pack_id: string;
  pack_name: string;
  credits: number;
  cash_added: number;
  crypto_added: number;
  created_at: number;
};

const TONE: Record<ShopPack["tone"], { ring: string; icon: string; glow: string; badge: "green" | "violet" | "amber" | "red" }> = {
  green: { ring: "border-[rgba(47,227,160,.25)]", icon: "text-[#5beeb9]", glow: "rgba(47,227,160,.16)", badge: "green" },
  violet: { ring: "border-[rgba(139,123,255,.28)]", icon: "text-[#b3a8ff]", glow: "rgba(139,123,255,.16)", badge: "violet" },
  amber: { ring: "border-[rgba(255,192,97,.26)]", icon: "text-[#ffd08d]", glow: "rgba(255,192,97,.16)", badge: "amber" },
  red: { ring: "border-[rgba(255,93,122,.25)]", icon: "text-[#ff8fa3]", glow: "rgba(255,93,122,.14)", badge: "red" },
};

export function ShopView({
  user,
  purchases: initialPurchases,
  powerups: initialPowerups,
}: {
  user: ShopUser;
  purchases: Purchase[];
  powerups: Record<string, number>;
}) {
  const router = useRouter();
  const { push } = useToast();
  const { socket, connected } = useMarket();
  const [credits, setCredits] = useState(user.credits);
  const [cash, setCash] = useState(user.cash);
  const [cryptoCash, setCryptoCash] = useState(user.cryptoCash);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [powerups, setPowerups] = useState<Record<string, number>>(initialPowerups);
  const [buying, setBuying] = useState<string | null>(null);
  const [buyingPowerup, setBuyingPowerup] = useState<string | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    const onCredits = (d: any) => {
      if (typeof d?.credits === "number") setCredits(d.credits);
    };
    const onPortfolio = (d: any) => {
      if (typeof d?.cash === "number") setCash(d.cash);
      if (typeof d?.cryptoCash === "number") setCryptoCash(d.cryptoCash);
      if (typeof d?.credits === "number") setCredits(d.credits);
    };
    const onInventory = (d: any) => {
      if (d?.inventory && typeof d.inventory === "object") setPowerups(d.inventory);
    };
    socket.on("credits:update", onCredits);
    socket.on("portfolio:update", onPortfolio);
    socket.on("arena:inventory", onInventory);
    return () => {
      socket.off("credits:update", onCredits);
      socket.off("portfolio:update", onPortfolio);
      socket.off("arena:inventory", onInventory);
    };
  }, [socket]);

  async function buy(pack: ShopPack) {
    if (buying) return;
    if (!user.verified) {
      push({ tone: "info", title: "Verify your identity", body: "Complete the ID check before buying capital packs." });
      router.push("/verify");
      return;
    }
    if (credits < pack.credits) {
      push({ tone: "error", title: "Not enough credits", body: `Pass quizzes to earn ${pack.credits - credits} more credits.` });
      return;
    }
    setBuying(pack.id);
    try {
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not complete the purchase.");
      setCredits(data.credits);
      setCash(data.cash);
      setCryptoCash(data.cryptoCash);
      const amounts = packAmounts(pack, user.startCapital);
      setPurchases((prev) => [{
        id: -Date.now(),
        pack_id: pack.id,
        pack_name: pack.name,
        credits: pack.credits,
        cash_added: data.added?.cash ?? amounts.cash,
        crypto_added: data.added?.crypto ?? amounts.crypto,
        created_at: Date.now(),
      }, ...prev].slice(0, 8));
      setJustBought(pack.id);
      setTimeout(() => setJustBought(null), 1600);
      push({
        tone: "reward",
        title: `${pack.name} pack added`,
        body: `${fmtMoney(data.added?.cash ?? amounts.cash, user.region)} trading cash is ready.`,
      });
    } catch (err: any) {
      push({ tone: "error", title: "Purchase failed", body: err.message });
    } finally {
      setBuying(null);
    }
  }

  async function buyPowerup(powerup: Powerup) {
    if (buyingPowerup) return;
    if (!user.verified) {
      push({ tone: "info", title: "Verify your identity", body: "Complete the ID check before buying powerups." });
      router.push("/verify");
      return;
    }
    if (credits < powerup.cost) {
      push({
        tone: "error",
        title: "Not enough credits",
        body: `Win a battle or pass a quiz for ${powerup.cost - credits} more credits.`,
      });
      return;
    }
    setBuyingPowerup(powerup.id);
    try {
      const res = await fetch("/api/shop/powerup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ powerupId: powerup.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not buy that powerup.");
      setCredits(data.credits);
      if (data.inventory) setPowerups(data.inventory);
      push({
        tone: "reward",
        title: `${powerup.name} powerup added`,
        body: "It is ready in your next quiz battle.",
      });
    } catch (err: any) {
      push({ tone: "error", title: "Purchase failed", body: err.message });
    } finally {
      setBuyingPowerup(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffd08d]">
            <ShoppingBag size={11} /> Capital shop
          </div>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight sm:text-[28px]">Turn credits into capital</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
            Credits are earned by passing quizzes and staying active. Spend them here to top up your simulated
            trading balance, then put the capital to work in the terminal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:flex",
            connected ? "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.06)] text-[#8df5d0]" : "border-white/10 text-muted")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-[#2fe3a0]" : "bg-[#ffc061]")} />
            {connected ? "Live balance" : "Reconnecting"}
          </span>
          <Link href="/learn" className="btn btn-ghost btn-sm"><Gift size={13} /> Earn credits</Link>
          <Link href="/trade" className="btn btn-primary btn-sm"><TrendingUp size={13} /> Trade <ArrowRight size={13} /></Link>
        </div>
      </div>

      {!user.verified && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.06)] p-3.5">
          <ShieldCheck size={15} className="shrink-0 text-[#ffd08d]" />
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] font-semibold text-[#ffd08d]">Verify your identity to buy packs</div>
            <p className="text-[10px] leading-relaxed text-muted">
              You can browse the shop now. A quick ID check unlocks purchases — no document, no simulated capital.
            </p>
          </div>
          <Link href="/verify" className="btn btn-primary btn-sm shrink-0">
            Verify now <ArrowRight size={12} />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Credits" value={<span className="flex items-center gap-1.5"><Zap size={18} /> {credits}</span>} sub="Learning currency" tone="amber" icon={<Coins size={14} />} />
        <Stat label="Trading cash" value={fmtMoney(cash, user.region)} sub="Main brokerage balance" tone="green" icon={<Wallet size={14} />} />
        <Stat label="Crypto sandbox" value={fmtMoney(cryptoCash, user.region)} sub="Isolated high-risk sleeve" tone="violet" icon={<Flame size={14} />} />
        <Stat label="Starting capital" value={fmtMoney(user.startCapital, user.region)} sub="Pack sizes scale from this" tone="neutral" icon={<Sparkles size={14} />} />
      </div>

      <div className="rounded-2xl border border-[rgba(255,192,97,.18)] bg-[rgba(255,192,97,.045)] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.08)] text-[#ffd08d]"><Gift size={16} /></span>
          <div>
            <div className="text-[12px] font-semibold">How credits work</div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Every quiz pass pays credits. Each pack converts a fixed number of credits into simulated money — a
              percentage of your starting capital, calculated on the server. Buying a pack never touches real money.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SHOP_PACKS.map((pack) => {
          const tone = TONE[pack.tone];
          const amounts = packAmounts(pack, user.startCapital);
          const affordable = credits >= pack.credits;
          const busy = buying === pack.id;
          const done = justBought === pack.id;
          return (
            <Card key={pack.id} className={cn("relative flex flex-col overflow-hidden", pack.highlight && tone.ring)}>
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full" style={{ background: `radial-gradient(circle, ${tone.glow}, transparent 65%)` }} />
              <div className="relative flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]", tone.icon)}>
                      <Coins size={16} />
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold">{pack.name}</div>
                      <div className="text-[9.5px] text-muted">{pack.tagline}</div>
                    </div>
                  </div>
                  {pack.highlight && <Badge tone={tone.badge}>Popular</Badge>}
                </div>

                <p className="mt-2.5 min-h-[32px] text-[10px] leading-relaxed text-muted">{pack.description}</p>

                <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-2.5">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-muted">Trading cash</span>
                    <span className="num font-semibold text-[#8df5d0]">+{fmtMoney(amounts.cash, user.region)}</span>
                  </div>
                  {amounts.crypto > 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
                      <span className="text-muted">Crypto sandbox</span>
                      <span className="num font-semibold text-[#b3a8ff]">+{fmtMoney(amounts.crypto, user.region)}</span>
                    </div>
                  )}
                  <div className="mt-1.5 flex items-center justify-between border-t border-white/[0.05] pt-1.5 text-[9.5px] text-muted/70">
                    <span>{Math.round(pack.cashPct * 100)}% of starting capital</span>
                    <span className="flex items-center gap-1 text-[#ffd08d]"><Zap size={9} /> {pack.credits} credits</span>
                  </div>
                </div>

                <button
                  onClick={() => buy(pack)}
                  disabled={!affordable || Boolean(buying)}
                  className={cn("btn mt-3 w-full btn-sm", done ? "btn-ghost text-[#5beeb9]" : affordable ? "btn-primary" : "btn-dark opacity-60")}
                >
                  {busy ? (
                    <><Loader2 size={13} className="animate-spin" /> Adding capital…</>
                  ) : done ? (
                    <><CheckCircle2 size={13} /> Added to balance</>
                  ) : affordable ? (
                    <><ShoppingBag size={13} /> Buy for {pack.credits} credits</>
                  ) : (
                    <><Zap size={13} /> Need {pack.credits - credits} more</>
                  )}
                </button>
                {!affordable && (
                  <Link href="/learn" className="mt-1.5 text-center text-[9.5px] font-medium text-[#5beeb9] hover:underline">
                    Pass a quiz to earn credits
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHead title="Quiz powerups" subtitle="Single-use boosts for live 1v1 battles" />
          <div className="flex items-center gap-2">
            <Link href="/leaderboard" className="btn btn-ghost btn-sm">Leaderboard</Link>
            <Link href="/arena" className="btn btn-ghost btn-sm"><Swords size={13} /> Enter the arena</Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {POWERUP_LIST.map((powerup) => {
            const owned = powerups[powerup.id] ?? 0;
            const affordable = credits >= powerup.cost;
            const busy = buyingPowerup === powerup.id;
            const tint =
              powerup.tone === "cyan" ? "border-[rgba(127,220,255,.22)] bg-[rgba(127,220,255,.06)] text-[#7fdcff]"
              : powerup.tone === "violet" ? "border-[rgba(179,168,255,.22)] bg-[rgba(139,123,255,.07)] text-[#b3a8ff]"
              : powerup.tone === "amber" ? "border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.07)] text-[#ffd08d]"
              : "border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.06)] text-[#8df5d0]";
            return (
              <Card key={powerup.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", tint)}>
                    {powerup.id === "fifty" ? <span className="text-[10px] font-bold">50</span>
                      : powerup.id === "skip" ? <SkipForward size={15} />
                      : powerup.id === "freeze" ? <Snowflake size={15} />
                      : <Flame size={15} />}
                  </span>
                  <div className="text-right">
                    <div className="text-[9px] uppercase tracking-[0.12em] text-muted/70">Owned</div>
                    <div className="num text-[13px] font-semibold">{owned}</div>
                  </div>
                </div>
                <div className="mt-2.5 text-[12.5px] font-semibold">{powerup.name}</div>
                <p className="mt-1 min-h-[42px] text-[10px] leading-relaxed text-muted">{powerup.description}</p>
                <div className="mt-auto flex items-center justify-between border-t border-white/[0.05] pt-2.5 text-[10px]">
                  <span className="flex items-center gap-1 text-[#ffd08d]"><Zap size={10} /> {powerup.cost} credits</span>
                  <span className="text-muted">{powerup.short}</span>
                </div>
                <button
                  onClick={() => buyPowerup(powerup)}
                  disabled={!affordable || Boolean(buyingPowerup)}
                  className={cn("btn mt-2.5 w-full btn-sm", affordable ? "btn-primary" : "btn-dark opacity-60")}
                >
                  {busy ? <><Loader2 size={12} className="animate-spin" /> Buying…</>
                    : affordable ? <><ShoppingBag size={12} /> Buy powerup</>
                    : <><Zap size={12} /> Need {powerup.cost - credits} more</>}
                </button>
              </Card>
            );
          })}
        </div>
        <p className="text-[10px] leading-relaxed text-muted/70">
          Powerups are consumed the moment you use them in a match. 50:50 removes two wrong options, Skip burns a
          question, Freeze cuts four seconds off your opponent's clock, and Double makes your next correct answer
          worth two.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-4 sm:p-5">
          <SectionHead title="Recent purchases" subtitle="Live from your account" />
          <Link href="/portfolio" className="btn btn-ghost btn-sm">View portfolio <ArrowRight size={12} /></Link>
        </div>
        {purchases.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-muted">
              <ShoppingBag size={18} />
            </div>
            <div className="mt-3 text-[13px] font-semibold">No packs yet</div>
            <p className="mx-auto mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-muted">
              Your first purchase will appear here. Credits are only spent when a pack is successfully added.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {purchases.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.06)] text-[#ffd08d]">
                  <Coins size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-semibold">{p.pack_name} pack</div>
                  <div className="text-[9.5px] text-muted">
                    {timeAgo(p.created_at)} · {p.credits} credits
                  </div>
                </div>
                <div className="text-right">
                  <div className="num text-[11px] font-semibold text-[#8df5d0]">+{fmtMoney(p.cash_added, user.region)}</div>
                  {p.crypto_added > 0 && <div className="num text-[9.5px] text-[#b3a8ff]">+{fmtMoney(p.crypto_added, user.region)} sandbox</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
