import { all } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAssets, getOrders } from "@/lib/data";
import { getIntraday } from "@/lib/engine";
import { toLocal } from "@/lib/finance";
import { TradeTerminal, type TerminalAsset } from "@/components/trade-terminal";

export const dynamic = "force-dynamic";

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const assets = getAssets();

  const terminalAssets: TerminalAsset[] = assets.map((a) => ({
    symbol: a.symbol,
    name: a.name,
    class: a.class,
    region: a.region,
    sector: a.sector,
    price: a.price,
    prev_close: a.prev_close,
    volatility: a.volatility,
    esg: a.esg,
  }));

  const requested = params.symbol?.toUpperCase();
  const initialSymbol = assets.some((a) => a.symbol === requested)
    ? (requested as string)
    : assets.find((a) => a.symbol === "RELIANCE")?.symbol ?? assets[0]?.symbol ?? "RELIANCE";

  const points = getIntraday(initialSymbol).map((p) => ({
    t: Math.floor(p.t / 1000),
    v: toLocal(p.p, user.region),
  }));

  const holdings = all<{ symbol: string; qty: number; avg_price: number }>(
    "SELECT symbol, qty, avg_price FROM holdings WHERE user_id = ? AND qty > 0",
    user.id
  ).map((h) => ({
    symbol: h.symbol,
    qty: h.qty,
    avgLocal: toLocal(h.avg_price, user.region),
  }));

  const orders = getOrders(user.id, 12);

  return (
    <TradeTerminal
      assets={terminalAssets}
      region={user.region}
      cash={user.cash}
      cryptoCash={user.crypto_cash}
      holdings={holdings}
      orders={orders}
      initialSymbol={initialSymbol}
      initialPoints={points}
      verified={Boolean(user.id_verified && user.terms_accepted && ["approved", "not_required"].includes(user.guardian_status))}
    />
  );
}
