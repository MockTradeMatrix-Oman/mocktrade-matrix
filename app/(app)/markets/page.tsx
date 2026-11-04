import { all } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAssets } from "@/lib/data";
import { MarketsView, type MarketAsset } from "@/components/markets-view";

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  const user = await requireUser();
  const assets = getAssets();

  const rows: MarketAsset[] = assets.map((a) => {
    const candles = all<{ c: number }>(
      "SELECT c FROM candles WHERE symbol = ? ORDER BY t DESC LIMIT 24",
      a.symbol
    );
    return {
      symbol: a.symbol,
      name: a.name,
      class: a.class,
      region: a.region,
      sector: a.sector,
      price: a.price,
      prev_close: a.prev_close,
      sentiment: a.sentiment,
      headline: a.headline,
      esg: a.esg,
      about: a.about,
      spark: candles.map((c) => c.c).reverse(),
    };
  });

  return <MarketsView assets={rows} region={user.region} />;
}
