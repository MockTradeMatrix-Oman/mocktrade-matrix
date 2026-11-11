import "server-only";
import { all, one } from "./db";
import type { PublicUser } from "./auth";
import { buildPortfolioReport } from "./report";
import { fmtMoney, levelFromXp } from "./finance";
import { getPortfolioHistory } from "./data";
import type { AnalyticsMetric, AnalyticsReport, MetricBand } from "./analytics-types";

function bandFor(value: number, good: number, watch: number): MetricBand {
  if (value >= good) return "good";
  if (value >= watch) return "watch";
  return "risk";
}

/** Higher is better for these metrics; lower is better is handled inline. */
function worseBand(value: number, risk: number, watch: number): MetricBand {
  if (value >= risk) return "risk";
  if (value >= watch) return "watch";
  return "good";
}

function maxDrawdown(points: Array<{ v: number }>): number | null {
  if (points.length < 2) return null;
  let peak = points[0].v;
  let worst = 0;
  for (const point of points) {
    if (point.v > peak) peak = point.v;
    if (peak > 0) {
      const drawdown = ((point.v - peak) / peak) * 100;
      if (drawdown < worst) worst = drawdown;
    }
  }
  return worst;
}

function arenaRecord(userId: number) {
  const row = one<{ matches: number; wins: number }>(
    `SELECT COUNT(*) AS matches,
            COALESCE(SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END), 0) AS wins
       FROM arena_matches
      WHERE (p1 = ? OR p2 = ?) AND status = 'finished'`,
    userId, userId, userId
  );
  return { matches: row?.matches ?? 0, wins: row?.wins ?? 0 };
}

/**
 * Builds the full Premium analytics pack from real records. Every number is
 * derived from the learner's own trades, holdings, quiz attempts, arena
 * matches and module progress. Missing history yields null metrics rather
 * than estimated values.
 */
export function buildAnalytics(user: PublicUser): AnalyticsReport {
  const historyPoints = getPortfolioHistory(user, 180);
  const report = buildPortfolioReport(user, { history: historyPoints });
  const { portfolio, behavioral, orders } = report;
  const region = user.region;

  const mainTotal = portfolio.cash + portfolio.marketValue;
  const totalReturnPct =
    user.start_capital > 0 ? ((mainTotal - user.start_capital) / user.start_capital) * 100 : 0;

  const positions = portfolio.positions;
  const investedValue = portfolio.marketValue;
  const weights = positions.map((p) =>
    investedValue > 0 ? p.value / investedValue : 0
  );
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  const effectiveHoldings = hhi > 0 ? 1 / hhi : 0;

  const cryptoShare =
    portfolio.marketValue + portfolio.cryptoValue > 0
      ? (portfolio.cryptoValue / (portfolio.marketValue + portfolio.cryptoValue)) * 100
      : 0;

  const worstPosition = positions.reduce(
    (worst, p) => (p.pnlPct < worst ? p.pnlPct : worst),
    positions.length > 0 ? 0 : 0
  );

  const drawdownPct = maxDrawdown(historyPoints);

  const buying = orders.filter((o) => o.side === "BUY");
  const sells = orders.filter((o) => o.side === "SELL");
  const activeDays = new Set(
    orders.map((o) => new Date(o.created_at).toISOString().slice(0, 10))
  ).size;
  const grossNotional = orders.reduce((sum, o) => sum + o.notional, 0);
  const fees = orders.reduce((sum, o) => sum + o.fee, 0);
  const tax = orders.reduce((sum, o) => sum + o.tax, 0);
  const costRatio = grossNotional > 0 ? ((fees + tax) / grossNotional) * 100 : 0;
  const largestFill = orders.reduce((max, o) => Math.max(max, o.notional), 0);
  const largestFillPct =
    user.start_capital > 0 ? (largestFill / user.start_capital) * 100 : 0;
  const avgFill = orders.length > 0 ? grossNotional / orders.length : 0;

  const risk: AnalyticsMetric[] = [
    {
      key: "drawdown",
      label: "Mark-to-market drawdown",
      value: drawdownPct,
      unit: "pct",
      detail:
        drawdownPct === null
          ? "Not enough holding history to measure a drawdown."
          : `Worst fall from peak across ${historyPoints.length} mark-to-market points on current holdings, cash excluded.`,
      band:
        drawdownPct === null
          ? "none"
          : drawdownPct <= -10
            ? "risk"
            : drawdownPct <= -5
              ? "watch"
              : "good",
    },
    {
      key: "concentration",
      label: "Concentration (largest holding)",
      value: positions.length > 0 ? behavioral.metrics.largestWeight : null,
      unit: "pct",
      detail:
        positions.length === 0
          ? "No open positions yet."
          : behavioral.metrics.largestWeight > 35
            ? "A single holding dominates the portfolio. Consider trimming or adding unrelated exposure."
            : "The largest holding is within a moderate band.",
      band:
        positions.length === 0
          ? "none"
          : worseBand(behavioral.metrics.largestWeight, 50, 35),
    },
    {
      key: "effective",
      label: "Effective number of holdings",
      value: effectiveHoldings > 0 ? effectiveHoldings : null,
      unit: "count",
      detail:
        effectiveHoldings > 0
          ? "Weight-adjusted breadth: 1 means one holding, higher means more even spread."
          : "No invested capital to measure.",
      band:
        effectiveHoldings === 0
          ? "none"
          : effectiveHoldings >= 4
            ? "good"
            : effectiveHoldings >= 2
              ? "watch"
              : "risk",
    },
    {
      key: "classes",
      label: "Asset-class spread",
      value: positions.length > 0 ? behavioral.metrics.classes : null,
      unit: "count",
      detail:
        positions.length === 0
          ? "No open positions yet."
          : `${behavioral.metrics.classes} of 5 asset classes represented in the main account.`,
      band:
        positions.length === 0
          ? "none"
          : behavioral.metrics.classes >= 3
            ? "good"
            : behavioral.metrics.classes >= 2
              ? "watch"
              : "risk",
    },
    {
      key: "cash",
      label: "Cash buffer",
      value: mainTotal > 0 ? behavioral.metrics.cashPct : null,
      unit: "pct",
      detail:
        mainTotal <= 0
          ? "No account balance."
          : behavioral.metrics.cashPct < 10
            ? "Very little dry powder. A cash buffer helps you avoid forced exits."
            : "You are holding a deliberate cash buffer.",
      band:
        mainTotal <= 0
          ? "none"
          : behavioral.metrics.cashPct >= 15
            ? "good"
            : behavioral.metrics.cashPct >= 8
              ? "watch"
              : "risk",
    },
    {
      key: "crypto",
      label: "Crypto sandbox share",
      value: portfolio.cryptoValue > 0 ? cryptoShare : null,
      unit: "pct",
      detail:
        portfolio.cryptoValue > 0
          ? "Crypto is isolated from the main account. Size it deliberately."
          : "No crypto exposure. The sandbox is empty.",
      band:
        portfolio.cryptoValue <= 0
          ? "none"
          : cryptoShare <= 20
            ? "good"
            : cryptoShare <= 40
              ? "watch"
              : "risk",
    },
  ];

  const execution: AnalyticsMetric[] = [
    {
      key: "fills",
      label: "Executions",
      value: orders.length,
      unit: "count",
      detail:
        orders.length === 0
          ? "No trades yet, so execution quality cannot be measured."
          : `${buying.length} buys and ${sells.length} sells over ${activeDays} active ${activeDays === 1 ? "day" : "days"}.`,
      band: orders.length === 0 ? "none" : "good",
    },
    {
      key: "cost",
      label: "Fees + tax as % of traded value",
      value: orders.length > 0 ? costRatio : null,
      unit: "pct",
      detail:
        orders.length === 0
          ? "No fills yet."
          : `${fmtMoney(fees + tax, region)} paid on ${fmtMoney(grossNotional, region)} of traded value.`,
      band: orders.length === 0 ? "none" : worseBand(costRatio, 1, 0.5),
    },
    {
      key: "turnover",
      label: "Turnover vs starting capital",
      value: orders.length > 0 ? behavioral.metrics.turnover : null,
      unit: "x",
      detail:
        orders.length === 0
          ? "No fills yet."
          : `You have traded ${behavioral.metrics.turnover.toFixed(1)}× your starting capital.`,
      band: orders.length === 0 ? "none" : worseBand(behavioral.metrics.turnover, 25, 12),
    },
    {
      key: "cadence",
      label: "Fills per active day",
      value: activeDays > 0 ? orders.length / activeDays : null,
      unit: "count",
      detail:
        activeDays === 0
          ? "No active trading days yet."
          : "Lower cadence usually means less reactive, more planned trading.",
      band:
        activeDays === 0
          ? "none"
          : worseBand(orders.length / activeDays, 6, 3.5),
    },
    {
      key: "avgsize",
      label: "Average fill size",
      value: orders.length > 0 ? avgFill : null,
      unit: "money",
      detail:
        orders.length === 0
          ? "No fills yet."
          : `${fmtMoney(avgFill, region)} per execution.`,
      band: orders.length === 0 ? "none" : "good",
    },
    {
      key: "largestfill",
      label: "Largest fill vs starting capital",
      value: orders.length > 0 ? largestFillPct : null,
      unit: "pct",
      detail:
        orders.length === 0
          ? "No fills yet."
          : "Big single orders concentrate timing risk.",
      band: orders.length === 0 ? "none" : worseBand(largestFillPct, 40, 25),
    },
    {
      key: "winrate",
      label: "Closed-trade win rate",
      value: sells.length > 0 ? (behavioral.metrics.winningSells / sells.length) * 100 : null,
      unit: "pct",
      detail:
        sells.length === 0
          ? "No sells yet, so no closed-trade win rate."
          : `${behavioral.metrics.winningSells} of ${sells.length} sells closed at a taxable gain.`,
      band:
        sells.length === 0
          ? "none"
          : bandFor((behavioral.metrics.winningSells / sells.length) * 100, 55, 40),
    },
  ];

  const learningRow = one<{ avg: number | null; best: number | null; attempts: number }>(
    `SELECT AVG(CASE WHEN status = 'completed' THEN score END) AS avg,
            MAX(CASE WHEN status = 'completed' THEN score END) AS best,
            (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = ?) AS attempts
       FROM module_progress WHERE user_id = ?`,
    user.id, user.id
  );
  const modules = all<{ slug: string; title: string; status: string }>(
    `SELECT m.slug, m.title, COALESCE(mp.status, 'locked') AS status
       FROM modules m
       LEFT JOIN module_progress mp ON mp.module_id = m.id AND mp.user_id = ?
      WHERE m.is_published = 1
      ORDER BY m.order_index`,
    user.id
  );
  const next = modules.find((m) => m.status !== "completed") ?? null;
  const arena = arenaRecord(user.id);
  const level = levelFromXp(user.xp);

  const learning = {
    modulesDone: behavioral.metrics.modulesDone,
    totalModules: modules.length,
    avgQuiz: learningRow?.avg ?? 0,
    bestQuiz: learningRow?.best ?? 0,
    attempts: learningRow?.attempts ?? 0,
    crashDone: Boolean(user.crash_done),
    streak: user.streak,
    xp: user.xp,
    level: level.level,
    arenaMatches: arena.matches,
    arenaWins: arena.wins,
    nextModule: next ? { slug: next.slug, title: next.title } : null,
  };

  const guidance: string[] = [];

  if (modules.length > 0 && learning.modulesDone < modules.length) {
    guidance.push(
      `Complete the remaining ${modules.length - learning.modulesDone} modules. Next up: ${next?.title ?? "the learning ladder"}.`
    );
  }
  if (learning.modulesDone > 0 && learning.avgQuiz < 80) {
    guidance.push(
      `Your average quiz score is ${learning.avgQuiz.toFixed(0)}%. Re-read the explanations for missed questions and aim for 80%+ before a final assessment.`
    );
  }
  if (!learning.crashDone) {
    guidance.push("Run a crash drill. Reacting to a simulated crash is different from reading about one.");
  }
  if (orders.length === 0) {
    guidance.push("Place a first trade in the terminal so execution and risk metrics can be measured.");
  } else {
    if (behavioral.metrics.turnover > 12) {
      guidance.push(
        `Turnover is ${behavioral.metrics.turnover.toFixed(1)}× starting capital. Fewer, higher-conviction trades would cut costs and noise.`
      );
    }
    if (costRatio > 0.5) {
      guidance.push(
        `Fees and tax consumed ${costRatio.toFixed(2)}% of traded value. Trade less frequently and avoid very small orders.`
      );
    }
    if (behavioral.metrics.largestWeight > 35) {
      guidance.push(
        `Your largest holding is ${behavioral.metrics.largestWeight.toFixed(1)}% of invested value. Consider trimming it or adding unrelated exposure.`
      );
    }
    if (behavioral.metrics.classes < 3) {
      guidance.push("Spread exposure across at least three asset classes before increasing position size.");
    }
    if (sells.length >= 4 && behavioral.metrics.winningSells / sells.length < 0.4) {
      guidance.push(
        `Only ${behavioral.metrics.winningSells} of ${sells.length} sells closed at a gain. Write the exit reason before you buy.`
      );
    }
    if (worstPosition < -10) {
      guidance.push(
        `Your weakest open position is ${worstPosition.toFixed(1)}%. Decide whether the original thesis still holds instead of averaging down automatically.`
      );
    }
  }
  if (mainTotal > 0 && behavioral.metrics.cashPct < 10) {
    guidance.push("Keep at least 10–15% cash so a sudden opportunity or drawdown does not force a sale.");
  }
  if (learning.streak < 3) {
    guidance.push("Log in on consecutive days. Short, regular sessions beat occasional long ones.");
  }
  if (learning.modulesDone === modules.length && modules.length > 0) {
    guidance.push("All modules are complete. Take the final assessment to unlock the Completion Merit Certificate.");
  }
  if (guidance.length === 0) {
    guidance.push("No weak signals in the current record. Keep the same process and build a longer history.");
  }

  return {
    generatedAt: report.generatedAt,
    user: { name: user.name, email: user.email, region, mode: user.mode },
    headline: [
      {
        label: "Main account",
        value: mainTotal,
        unit: "money",
        sub: "Cash + market value",
        band: "none",
      },
      {
        label: "Total return",
        value: totalReturnPct,
        unit: "pct",
        sub: `${fmtMoney(mainTotal - user.start_capital, region)} against ${fmtMoney(user.start_capital, region)} starting capital`,
        band: totalReturnPct >= 0 ? "good" : totalReturnPct > -5 ? "watch" : "risk",
      },
      {
        label: "Realised P&L",
        value: portfolio.realized,
        unit: "money",
        sub: "After fees and tax",
        band: portfolio.realized >= 0 ? "good" : "risk",
      },
      {
        label: "Unrealised P&L",
        value: portfolio.unrealized,
        unit: "money",
        sub: `${positions.length} open ${positions.length === 1 ? "position" : "positions"}`,
        band: portfolio.unrealized >= 0 ? "good" : "risk",
      },
      {
        label: "Fees + tax paid",
        value: portfolio.feesPaid + portfolio.taxPaid,
        unit: "money",
        sub: `${orders.length} ${orders.length === 1 ? "fill" : "fills"}`,
        band: "watch",
      },
      {
        label: "Leaderboard",
        value: report.rank ? report.rank.rank : null,
        unit: "count",
        sub: report.rank ? `${report.rank.returnPct.toFixed(2)}% ranked return` : "No ranked return yet",
        band: report.rank ? "good" : "none",
      },
    ],
    risk: {
      score: behavioral.score,
      band: behavioral.band,
      coverage: behavioral.coverage,
      metrics: risk,
    },
    execution,
    learning,
    guidance,
  };
}
