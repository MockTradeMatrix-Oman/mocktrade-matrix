import { all, one } from "@/lib/db";
import { getAssets, getPredictionStats } from "@/lib/data";
import {
  Landing,
  type LandingAsset,
  type LandingForecast,
  type LandingModule,
} from "@/components/landing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const assets = getAssets();
  const stats = getPredictionStats();
  const modules = one<{ c: number }>("SELECT COUNT(*) AS c FROM modules WHERE is_published = 1")?.c ?? 0;
  const quizCount = one<{ c: number }>("SELECT COUNT(*) AS c FROM quiz_questions")?.c ?? 0;

  const forecasts = all<LandingForecast>(
    `SELECT symbol, direction, confidence, start_price, target_price
     FROM predictions WHERE resolved_at IS NULL ORDER BY confidence DESC LIMIT 3`
  );

  const ladder = all<LandingModule>(
    `SELECT title, level, reward_credits
     FROM modules WHERE is_published = 1 ORDER BY order_index LIMIT 8`
  );

  const sparkBySymbol = new Map<string, number[]>();
  for (const a of assets) {
    const rows = all<{ c: number }>(
      "SELECT c FROM candles WHERE symbol = ? ORDER BY t DESC LIMIT 24",
      a.symbol
    );
    sparkBySymbol.set(a.symbol, rows.map((r) => r.c).reverse());
  }

  const landingAssets: LandingAsset[] = assets.map((a) => ({
    symbol: a.symbol,
    name: a.name,
    class: a.class,
    region: a.region,
    price: a.price,
    prev_close: a.prev_close,
    esg: a.esg,
    spark: sparkBySymbol.get(a.symbol) ?? [a.price, a.price],
  }));

  return (
    <Landing
      assets={landingAssets}
      accuracy={stats.accuracy}
      modules={modules}
      quizCount={quizCount}
      forecasts={forecasts}
      ladder={ladder}
    />
  );
}
