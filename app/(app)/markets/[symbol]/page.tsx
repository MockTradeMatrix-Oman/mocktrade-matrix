import { notFound } from "next/navigation";
import { all, one } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAsset, getAssets, getActivePrediction, getPredictionStats } from "@/lib/data";
import { getIntraday } from "@/lib/engine";
import { toLocal } from "@/lib/finance";
import { AssetDetail } from "@/components/asset-detail";

export const dynamic = "force-dynamic";

export default async function AssetPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const user = await requireUser();
  const asset = getAsset(symbol.toUpperCase());
  if (!asset) notFound();

  const points = getIntraday(asset.symbol).map((p) => ({
    t: Math.floor(p.t / 1000),
    v: toLocal(p.p, user.region),
  }));

  const holding = one<{ qty: number; avg_price: number }>(
    "SELECT qty, avg_price FROM holdings WHERE user_id = ? AND symbol = ?",
    user.id, asset.symbol
  );

  const prediction = getActivePrediction(asset.symbol);
  const accuracy = getPredictionStats().accuracy;

  const related = getAssets(asset.class)
    .filter((a) => a.symbol !== asset.symbol)
    .slice(0, 6)
    .map((a) => ({
      symbol: a.symbol,
      name: a.name,
      class: a.class,
      price: a.price,
      prev_close: a.prev_close,
      spark: all<{ c: number }>("SELECT c FROM candles WHERE symbol = ? ORDER BY t DESC LIMIT 24", a.symbol)
        .map((c) => c.c)
        .reverse(),
    }));

  return (
    <AssetDetail
      asset={{
        symbol: asset.symbol,
        name: asset.name,
        class: asset.class,
        region: asset.region,
        sector: asset.sector,
        price: asset.price,
        prev_close: asset.prev_close,
        day_open: asset.day_open,
        base_price: asset.base_price,
        volatility: asset.volatility,
        sentiment: asset.sentiment,
        headline: asset.headline,
        esg: asset.esg,
        about: asset.about,
      }}
      initialPoints={points}
      region={user.region}
      cash={user.cash}
      cryptoCash={user.crypto_cash}
      holding={holding && holding.qty > 0 ? { qty: holding.qty, avgLocal: toLocal(holding.avg_price, user.region) } : null}
      forecast={prediction ? {
        direction: prediction.direction,
        confidence: prediction.confidence,
        start_price: prediction.start_price,
        target_price: prediction.target_price,
        created_at: prediction.created_at,
      } : null}
      accuracy={accuracy}
      related={related}
    />
  );
}
