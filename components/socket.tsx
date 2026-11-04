"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toLocal } from "@/lib/finance";
import { useToast } from "./toast";

export type MarketTick = {
  s: string;
  p: number;
  pc: number;
  c: string;
  chg: number;
  sent: number;
};

export type CrashState = { phase: "calm" | "warning" | "recovery"; nextAt: number; endsAt: number; active: boolean };

type MarketContextValue = {
  socket: Socket | null;
  connected: boolean;
  prices: Record<string, MarketTick>;
  headlines: Record<string, string>;
  crash: CrashState;
  accuracy: number;
  online: number;
  lastTick: number;
};

const MarketCtx = createContext<MarketContextValue>({
  socket: null,
  connected: false,
  prices: {},
  headlines: {},
  crash: { phase: "calm", nextAt: 0, endsAt: 0, active: false },
  accuracy: 0,
  online: 0,
  lastTick: 0,
});

export function useMarket() {
  return useContext(MarketCtx);
}

export function SocketProvider({
  children,
  initialAssets,
  initialAccuracy = 0,
}: {
  children: React.ReactNode;
  initialAssets: Array<{ symbol: string; price: number; prev_close: number; sentiment: number; class: string }>;
  initialAccuracy?: number;
}) {
  const [connected, setConnected] = useState(false);
  const [prices, setPrices] = useState<Record<string, MarketTick>>(() => {
    const map: Record<string, MarketTick> = {};
    for (const a of initialAssets) {
      map[a.symbol] = {
        s: a.symbol, p: a.price, pc: a.prev_close, c: a.class,
        chg: a.prev_close ? ((a.price - a.prev_close) / a.prev_close) * 100 : 0,
        sent: a.sentiment,
      };
    }
    return map;
  });
  const [headlines, setHeadlines] = useState<Record<string, string>>({});
  const [crash, setCrash] = useState<CrashState>({ phase: "calm", nextAt: 0, endsAt: 0, active: false });
  const [accuracy, setAccuracy] = useState(initialAccuracy);
  const [online, setOnline] = useState(0);
  const [lastTick, setLastTick] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { push } = useToast();
  const warned = useRef(false);

  useEffect(() => {
    const s = io({ path: "/api/socket", transports: ["websocket", "polling"] });
    setSocket(s);

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("market:state", (d: any) => {
      if (!d) return;
      const map: Record<string, MarketTick> = {};
      for (const a of d.assets ?? []) map[a.s] = a;
      setPrices(map);
      if (d.crash) setCrash(d.crash);
      if (typeof d.accuracy === "number" && d.accuracy > 0) setAccuracy(d.accuracy);
      setLastTick(d.t ?? Date.now());
    });

    s.on("market:tick", (d: any) => {
      setPrices((prev) => {
        const next = { ...prev };
        for (const a of d.assets ?? []) next[a.s] = a;
        return next;
      });
      setLastTick(d.t ?? Date.now());
    });

    s.on("market:news", (d: any) => {
      setHeadlines((prev) => {
        const next = { ...prev };
        for (const item of d.items ?? []) next[item.s] = item.headline;
        return next;
      });
      setPrices((prev) => {
        const next = { ...prev };
        for (const item of d.items ?? []) {
          if (next[item.s]) next[item.s] = { ...next[item.s], sent: item.sentiment };
        }
        return next;
      });
    });

    s.on("market:warning", (d: any) => {
      setCrash((c) => ({ ...c, phase: "warning", nextAt: d.at }));
      push({ tone: "error", title: "Crash drill inbound", body: "A simulated 50% drawdown hits in 20 seconds. This is training." });
    });
    s.on("market:crash", (d: any) => {
      setCrash({ phase: "recovery", nextAt: 0, endsAt: d.recoversAt, active: true });
      warned.current = true;
    });
    s.on("market:recovered", () => {
      setCrash((c) => ({ ...c, phase: "calm", active: false, endsAt: 0 }));
      push({ tone: "success", title: "Market recovered", body: "The crash drill is over. Check how your habits held up." });
    });
    s.on("ai:resolved", (d: any) => {
      if (d?.accuracy) setAccuracy(d.accuracy);
    });
    s.on("presence", (d: any) => setOnline(d?.online ?? 0));

    return () => {
      s.disconnect();
    };
  }, [push]);

  const value = useMemo(
    () => ({ socket, connected, prices, headlines, crash, accuracy, online, lastTick }),
    [socket, connected, prices, headlines, crash, accuracy, online, lastTick]
  );

  return <MarketCtx.Provider value={value}>{children}</MarketCtx.Provider>;
}

export type LivePosition = {
  symbol: string;
  qty: number;
  priceUsd: number;
  avgLocal: number;
  dayPct: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
  priceLocal: number;
};

export function useLivePortfolio<T extends LivePosition>(
  positions: T[],
  cash: number,
  region: string
) {
  const { prices } = useMarket();
  return useMemo(() => {
    let marketValue = 0;
    let cost = 0;
    let dayChange = 0;
    const live = positions.map((p) => {
      const tick = prices[p.symbol];
      const priceUsd = tick?.p ?? p.priceUsd;
      const priceLocal = toLocal(priceUsd, region);
      const value = priceLocal * p.qty;
      const c = p.avgLocal * p.qty;
      const dc = tick ? toLocal(tick.p - tick.pc, region) * p.qty : p.dayChange;
      marketValue += value;
      cost += c;
      dayChange += dc;
      return {
        ...p,
        priceUsd,
        priceLocal,
        value,
        cost: c,
        pnl: value - c,
        pnlPct: c > 0 ? ((value - c) / c) * 100 : 0,
        dayChange: dc,
        dayPct: tick?.chg ?? p.dayPct,
      };
    });
    const total = cash + marketValue;
    return {
      positions: live,
      marketValue,
      cost,
      dayChange,
      total,
      unrealized: marketValue - cost,
      dayPct: total - dayChange > 0 ? (dayChange / (total - dayChange)) * 100 : 0,
    };
  }, [positions, prices, cash, region]);
}
