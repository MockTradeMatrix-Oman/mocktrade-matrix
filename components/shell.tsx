"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, Award, BarChart3, Bell, Building2, CandlestickChart, CheckCircle2, ChevronRight, Crown, GraduationCap,
  Info, LayoutDashboard, LineChart, LogOut, Menu, ScanFace, Settings2, ShieldCheck, ShoppingBag, Sparkles,
  Swords, Trophy, Users, Wallet, X, Zap,
} from "lucide-react";
import { Avatar, Badge, cn, Progress } from "./ui";
import { Wordmark, Logo } from "./logo";
import { useMarket } from "./socket";
import { useToast } from "./toast";
import { fmtMoney, levelFromXp, modeName, timeAgo, toLocal } from "@/lib/finance";

type ShellUser = {
  id: number; name: string; email: string; avatar: string; mode: string; region: string;
  role: string; verified: boolean; institutionAccess: boolean;
  premium: boolean; planLabel: string;
  credits: number; cash: number; xp: number; streak: number; accent: string;
};

type Notification = {
  id: number; type: string; title: string; body: string; read: number; created_at: number;
};

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: LineChart },
  { href: "/trade", label: "Trade terminal", icon: CandlestickChart },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/shop", label: "Capital shop", icon: ShoppingBag },
  { href: "/learn", label: "Learning ladder", icon: GraduationCap },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/certificate", label: "Certificate", icon: Award },
  { href: "/pricing", label: "Plans", icon: Crown },
  { href: "/arena", label: "Quiz arena", icon: Swords },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/friends", label: "Friends", icon: Users },
];

const TITLES: Record<string, { title: string; crumb: string }> = {
  "/dashboard": { title: "Overview", crumb: "Workspace" },
  "/markets": { title: "Markets", crumb: "Universe" },
  "/trade": { title: "Trade terminal", crumb: "Execution" },
  "/portfolio": { title: "Portfolio", crumb: "Positions" },
  "/shop": { title: "Capital shop", crumb: "Credits" },
  "/learn": { title: "Learning ladder", crumb: "Curriculum" },
  "/analytics": { title: "Analytics", crumb: "Insight" },
  "/certificate": { title: "Certificate", crumb: "Achievement" },
  "/exam": { title: "Final assessment", crumb: "Certificate" },
  "/pricing": { title: "Plans", crumb: "Access" },
  "/arena": { title: "Quiz arena", crumb: "Live battles" },
  "/leaderboard": { title: "Leaderboard", crumb: "Rankings" },
  "/friends": { title: "Friends", crumb: "Together" },
  "/institution": { title: "Institution", crumb: "Classrooms" },
  "/settings": { title: "Settings", crumb: "Account" },
  "/admin": { title: "Admin console", crumb: "Studio" },
};

function notifIcon(type: string) {
  const map: Record<string, React.ReactNode> = {
    success: <CheckCircle2 size={14} className="text-[#5beeb9]" />,
    reward: <Zap size={14} className="text-[#ffd08d]" />,
    social: <Users size={14} className="text-[#b3a8ff]" />,
    danger: <AlertTriangle size={14} className="text-[#ff8fa3]" />,
    warning: <AlertTriangle size={14} className="text-[#ffd08d]" />,
    info: <Info size={14} className="text-[#7fdcff]" />,
  };
  return map[type] ?? map.info;
}

function LevelRing({ xp, size = 40 }: { xp: number; size?: number }) {
  const { level, progress } = levelFromXp(xp);
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2fe3a0" strokeWidth={3} strokeLinecap="round"
          strokeDasharray={`${Math.max(0.06, progress) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#8df5d0]">{level}</div>
    </div>
  );
}

export function Shell({
  user,
  notifications,
  unread,
  friendBadges,
  children,
}: {
  user: ShellUser;
  notifications: Notification[];
  unread: number;
  friendBadges: { requests: number; unread: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { prices, connected, online, crash } = useMarket();
  const { push } = useToast();
  const [credits, setCredits] = useState(user.credits);
  const [notifs, setNotifs] = useState(notifications);
  const [unreadCount, setUnreadCount] = useState(unread);
  const [friendBadge, setFriendBadge] = useState(friendBadges.requests + friendBadges.unread);
  const [openBell, setOpenBell] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [region, setRegion] = useState(user.region);
  const [switchingCurrency, setSwitchingCurrency] = useState(false);
  const { socket } = useMarket();

  useEffect(() => setOpenMobile(false), [pathname]);
  useEffect(() => setRegion(user.region), [user.region]);
  useEffect(
    () => setFriendBadge(friendBadges.requests + friendBadges.unread),
    [friendBadges.requests, friendBadges.unread]
  );

  useEffect(() => {
    if (!socket) return;
    const onCredits = (d: any) => setCredits(d.credits);
    const onNotif = (n: Notification) => {
      setNotifs((prev) => [{ ...n, read: 0 }, ...prev].slice(0, 12));
      setUnreadCount((c) => c + 1);
      push({
        tone: n.type === "danger" || n.type === "warning" ? "error" : n.type === "reward" ? "reward" : n.type === "social" ? "info" : "success",
        title: n.title, body: n.body,
      });
      // Access changes alter the sidebar, so re-render the shell right away.
      if (/^Institution access (granted|removed)$/.test(n.title)) router.refresh();
    };
    socket.on("credits:update", onCredits);
    socket.on("notification", onNotif);
    return () => {
      socket.off("credits:update", onCredits);
      socket.off("notification", onNotif);
    };
  }, [socket, push, router]);

  // Friend requests and unread chats share one sidebar badge. Re-reading the
  // overview is cheap and keeps every tab (including a second window) honest.
  useEffect(() => {
    if (!socket) return;
    const refreshFriendBadge = async () => {
      try {
        const res = await fetch("/api/friends", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data?.badges) return;
        setFriendBadge(Number(data.badges.requests ?? 0) + Number(data.badges.unread ?? 0));
      } catch {
        /* ignore transient network errors */
      }
    };
    const events = ["friend:update", "friend:request", "friend:accepted", "friend:declined", "dm:message"];
    events.forEach((event) => socket.on(event, refreshFriendBadge));
    return () => {
      events.forEach((event) => socket.off(event, refreshFriendBadge));
    };
  }, [socket]);

  const tickerItems = useMemo(() => {
    const list = Object.values(prices)
      .filter((p) => p.c === "stock" || p.c === "crypto" || p.c === "etf")
      .sort((a, b) => a.s.localeCompare(b.s))
      .slice(0, 18);
    return [...list, ...list];
  }, [prices]);

  const activeTitle = pathname.startsWith("/markets/") ? { title: "Instrument", crumb: "Markets" }
    : pathname.startsWith("/learn/") ? { title: "Module", crumb: "Curriculum" }
    : pathname === "/admin/modules/new" ? { title: "New module", crumb: "Studio" }
    : pathname.startsWith("/admin/modules/") ? { title: "Edit module", crumb: "Studio" }
    : TITLES[pathname] ?? { title: "Workspace", crumb: "MockTrade" };

  const navItems = user.institutionAccess || user.role === "admin"
    ? [...NAV, { href: "/institution", label: "Institution", icon: Building2 }]
    : NAV;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: 1 })));
    setUnreadCount(0);
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  }

  async function switchCurrency(next: "IN" | "US") {
    if (next === region || switchingCurrency) return;
    const previous = region;
    setRegion(next);
    setSwitchingCurrency(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not switch currency.");
      }
      push({
        tone: "success",
        title: next === "IN" ? "Prices in Indian rupees" : "Prices in US dollars",
        body: "Balances and every price converted at the fixed FX rate.",
      });
      router.refresh();
    } catch (err: any) {
      setRegion(previous);
      push({ tone: "error", title: "Currency switch failed", body: err.message });
    } finally {
      setSwitchingCurrency(false);
    }
  }

  const currencyToggle = (
    <div
      role="group"
      aria-label="Display currency"
      className="flex items-center rounded-lg border border-white/[0.07] bg-white/[0.03] p-0.5"
    >
      {(["IN", "US"] as const).map((code) => {
        const active = region === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchCurrency(code)}
            disabled={switchingCurrency}
            aria-pressed={active}
            title={code === "IN" ? "Show every price in Indian rupees" : "Show every price in US dollars"}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold transition",
              active
                ? "bg-[rgba(47,227,160,.14)] text-[#8df5d0] shadow-[inset_0_0_0_1px_rgba(47,227,160,.25)]"
                : "text-muted hover:text-ink",
              switchingCurrency && "opacity-70"
            )}
          >
            {code === "IN" ? "₹ INR" : "$ USD"}
          </button>
        );
      })}
    </div>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-5">
        <Link href="/dashboard"><Wordmark /></Link>
      </div>

      <div className="px-3">
        <div className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/70">Workspace</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn("nav-link", active && "nav-link-active")}>
                <item.icon size={17} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.href === "/friends" && friendBadge > 0 ? (
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff5d7a] px-1 text-[9px] font-bold text-white">
                    {friendBadge > 99 ? "99+" : friendBadge}
                  </span>
                ) : (
                  active && <ChevronRight size={13} className="ml-auto text-[#2fe3a0]/70" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {user.role === "admin" && (
        <div className="mt-6 px-3">
          <div className="mb-2 flex items-center justify-between px-3">
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/70">Studio</span>
            <span className="rounded bg-[rgba(139,123,255,.14)] px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-[#b3a8ff]">Admin</span>
          </div>
          <nav className="space-y-1">
            <Link href="/admin" className={cn("nav-link", pathname.startsWith("/admin") && "nav-link-active")}>
              <ShieldCheck size={17} strokeWidth={1.8} />
              <span>Admin console</span>
              {pathname.startsWith("/admin") && <ChevronRight size={13} className="ml-auto text-[#2fe3a0]/70" />}
            </Link>
          </nav>
        </div>
      )}

      <div className="mt-auto space-y-3 p-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="flex items-center gap-3">
            <LevelRing xp={user.xp} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold">{user.name}</div>
              <div className="mt-0.5 truncate text-[10px] text-muted">{user.role === "admin" ? "Administrator" : modeName(user.mode)}</div>
            </div>
          </div>
          {user.premium && (
            <div className="mt-2 flex items-center gap-1 text-[9.5px] font-semibold text-[#ffd08d]">
              <Crown size={10} /> {user.planLabel}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-[#ffd08d]"><Zap size={11} /> {credits} credits</span>
            <span className="text-muted">{user.streak}d streak</span>
          </div>
          <Progress value={levelFromXp(user.xp).progress * 100} className="mt-2" />
        </div>
        <div className="flex items-center gap-1">
          <Link href="/settings" className={cn("nav-link flex-1", pathname === "/settings" && "nav-link-active")}>
            <Settings2 size={17} strokeWidth={1.8} /> Settings
          </Link>
          <button onClick={signOut} className="nav-link w-10 justify-center px-0" title="Sign out" aria-label="Sign out">
            <LogOut size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* ambient */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px] opacity-70"
        style={{ background: "radial-gradient(60% 100% at 50% -20%, rgba(47,227,160,.10), transparent 70%)" }} />

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-white/[0.055] bg-[#080b12]/85 backdrop-blur-xl lg:block">
        {sidebarInner}
      </aside>

      {/* mobile drawer */}
      {openMobile && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpenMobile(false)} />
          <div className="animate-fade-in absolute inset-y-0 left-0 w-[280px] border-r border-white/10 bg-[#080b12]">
            <button onClick={() => setOpenMobile(false)} className="absolute right-3 top-4 rounded-lg p-2 text-muted hover:bg-white/5">
              <X size={16} />
            </button>
            {sidebarInner}
          </div>
        </div>
      )}

      <div className="relative z-10 lg:pl-[248px]">
        {/* top bar */}
        <header className="sticky top-0 z-50 border-b border-white/[0.055] bg-[#06080d]/80 backdrop-blur-xl">
          <div className="flex h-[62px] items-center gap-3 px-4 lg:px-7">
            <button onClick={() => setOpenMobile(true)} className="rounded-lg border border-white/10 p-2 text-muted lg:hidden" aria-label="Open menu">
              <Menu size={16} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-muted/70">
                <span>{activeTitle.crumb}</span>
                <ChevronRight size={10} />
                <span className="text-muted">{activeTitle.title}</span>
              </div>
              <div className="truncate text-[14px] font-semibold tracking-tight">{activeTitle.title}</div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted sm:flex">
                <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-[#2fe3a0] shadow-[0_0_8px_#2fe3a0]" : "bg-[#ffc061] animate-pulse-soft")} />
                {connected ? `${Math.max(online, 1)} online` : "Reconnecting"}
              </span>

              <div className="hidden md:block">{currencyToggle}</div>

              <span className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.08)] px-2.5 py-1.5 text-[11px] font-semibold text-[#ffd08d]">
                <Zap size={12} /> {credits}
              </span>

              <div className="relative">
                <button onClick={() => { setOpenBell((v) => !v); setOpenUser(false); }}
                  className="relative rounded-lg border border-white/[0.07] bg-white/[0.03] p-2 text-muted transition hover:text-ink"
                  aria-label="Notifications">
                  <Bell size={15} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff5d7a] px-1 text-[9px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {openBell && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenBell(false)} />
                    <div className="animate-pop absolute right-0 top-11 z-20 w-[min(370px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl">
                      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                        <div className="text-[12px] font-semibold">Notifications</div>
                        <button onClick={markAllRead} className="text-[10.5px] font-medium text-[#5beeb9] hover:underline">Mark all read</button>
                      </div>
                      <div className="max-h-[360px] overflow-y-auto">
                        {notifs.length === 0 && <div className="p-6 text-center text-[12px] text-muted">Nothing here yet.</div>}
                        {notifs.map((n) => (
                          <div key={n.id} className={cn("flex gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0", !n.read && "bg-white/[0.015]")}>
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
                              {notifIcon(n.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <div className="text-[11.5px] font-semibold leading-snug">{n.title}</div>
                                {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2fe3a0]" />}
                              </div>
                              <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted">{n.body}</div>
                              <div className="mt-1 text-[9.5px] text-muted/60">{timeAgo(n.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button onClick={() => { setOpenUser((v) => !v); setOpenBell(false); }} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] p-1 pr-2 transition hover:border-white/15">
                  <Avatar name={user.name} size={26} />
                  <ChevronRight size={12} className="rotate-90 text-muted" />
                </button>
                {openUser && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenUser(false)} />
                    <div className="animate-pop absolute right-0 top-11 z-20 w-[230px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl">
                      <div className="border-b border-white/[0.06] p-4">
                        <div className="text-[12.5px] font-semibold">{user.name}</div>
                        <div className="mt-0.5 truncate text-[10.5px] text-muted">{user.email}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone="green">{modeName(user.mode)}</Badge>
                          <Badge>{region === "IN" ? "India" : "United States"}</Badge>
                          {user.role === "admin" && <Badge tone="violet">Admin</Badge>}
                          {user.premium && <Badge tone="amber"><Crown size={9} /> {user.planLabel}</Badge>}
                        </div>
                      </div>
                      <div className="border-b border-white/[0.06] px-4 py-3">
                        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">Display currency</div>
                        {currencyToggle}
                      </div>
                      {user.role === "admin" && (
                        <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-muted transition hover:bg-white/[0.04] hover:text-ink">
                          <ShieldCheck size={14} /> Admin console
                        </Link>
                      )}
                      <Link href="/pricing" className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-muted transition hover:bg-white/[0.04] hover:text-ink">
                        <Crown size={14} /> Plans &amp; access
                      </Link>
                      <Link href="/settings" className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-muted transition hover:bg-white/[0.04] hover:text-ink">
                        <Settings2 size={14} /> Account settings
                      </Link>
                      <button onClick={signOut} className="flex w-full items-center gap-2 border-t border-white/[0.06] px-4 py-2.5 text-left text-[12px] text-[#ff8fa3] transition hover:bg-white/[0.04]">
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ticker */}
          <div className="flex h-[34px] items-center overflow-hidden border-t border-white/[0.04] bg-black/20">
            <span className="z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-white/[0.06] bg-[#080b12] px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2fe3a0] shadow-[0_0_8px_#2fe3a0]" /> Live tape
            </span>
            <div className="relative flex-1 overflow-hidden">
              <div className="ticker-track items-center gap-0">
                {tickerItems.map((t, i) => (
                  <div key={`${t.s}-${i}`} className="flex shrink-0 items-center gap-2 border-r border-white/[0.04] px-3.5 text-[10.5px]">
                    <span className="font-semibold text-[#c9d2e2]">{t.s}</span>
                    <span className="num text-muted">{fmtMoney(toLocal(t.p, region), region, true)}</span>
                    <span className={cn("num text-[9.5px] font-semibold", t.chg >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                      {t.chg >= 0 ? "+" : ""}{t.chg.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        {crash.phase === "warning" && (
          <div className="flex items-center justify-center gap-2 border-b border-[rgba(255,93,122,.25)] bg-[rgba(255,93,122,.1)] px-4 py-2 text-[11px] font-semibold text-[#ffb3c0]">
            <AlertTriangle size={13} /> Forced crash drill in progress — a simulated 50% drawdown is about to hit.
          </div>
        )}

        {!user.verified && user.role !== "admin" && (
          <div className="border-b border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.06)]">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 lg:px-7">
              <ScanFace size={13} className="shrink-0 text-[#ffd08d]" />
              <span className="text-[11px] font-semibold text-[#ffd08d]">Identity check pending</span>
              <span className="text-[10.5px] text-muted">
                Browse freely — verify your ID when you are ready to trade or buy capital.
              </span>
              <Link href="/verify" className="btn btn-dark btn-sm ml-auto">
                Verify now <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
