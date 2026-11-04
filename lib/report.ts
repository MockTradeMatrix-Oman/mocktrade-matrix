import "server-only";
import { one } from "./db";
import {
  getOrders, getPortfolio, getPortfolioHistory, getTransactions, getUserRank,
  type Portfolio,
} from "./data";
import { fmtMoney, fmtPct } from "./finance";
import type { PublicUser } from "./auth";
import type {
  BehavioralComponent, BehavioralIndex, BehavioralMetrics, PortfolioReport,
  ReportHistory, ReportOrder, ReportTransaction,
} from "./report-types";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function bandFor(score: number | null, coverage: number) {
  if (score === null) return "Not enough data";
  if (coverage < 50) return "Forming";
  if (score >= 80) return "Disciplined";
  if (score >= 65) return "Balanced";
  if (score >= 50) return "Developing";
  return "At risk";
}

type LearningRow = {
  modulesDone: number;
  avgQuiz: number;
  crashDrills: number;
};

function getLearning(userId: number): LearningRow {
  const modules = one<{ done: number; avg_score: number | null }>(
    `SELECT COUNT(*) AS done, AVG(score) AS avg_score
     FROM module_progress WHERE user_id = ? AND status = 'completed'`,
    userId
  );
  const crashes = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM crash_events WHERE user_id = ?",
    userId
  );
  return {
    modulesDone: modules?.done ?? 0,
    avgQuiz: modules?.avg_score ?? 0,
    crashDrills: crashes?.n ?? 0,
  };
}

/**
 * Builds a behavioural index entirely from the learner's real records:
 * orders, holdings, cash, module progress and crash-drill history.
 *
 * Every component is scored 0-100. Components with no underlying data return
 * null instead of a fabricated value; the overall score is a weighted average
 * over the components that do have data, and `coverage` reports how much of
 * the full weight that represents.
 */
export function buildBehavioralIndex(
  user: PublicUser,
  portfolio: Portfolio,
  orders: ReportOrder[],
  learning: LearningRow
): BehavioralIndex {
  const positions = portfolio.positions;
  const marketValue = portfolio.marketValue;
  const totalMain = portfolio.cash + marketValue;

  const activeDays = new Set(
    orders.map((o) => new Date(o.created_at).toISOString().slice(0, 10))
  ).size;
  const grossNotional = orders.reduce((sum, o) => sum + o.notional, 0);
  const fees = orders.reduce((sum, o) => sum + o.fee, 0);
  const tax = orders.reduce((sum, o) => sum + o.tax, 0);
  const costRatio = grossNotional > 0 ? (fees + tax) / grossNotional : 0;
  const turnover = user.start_capital > 0 ? grossNotional / user.start_capital : 0;
  const sells = orders.filter((o) => o.side === "SELL");
  const winningSells = sells.filter((o) => o.tax > 0).length;

  const classes = new Set(positions.map((p) => p.class)).size;
  const largest = positions.reduce((max, p) => Math.max(max, p.value), 0);
  const largestWeight = marketValue > 0 ? (largest / marketValue) * 100 : 0;
  const cashPct = totalMain > 0 ? (portfolio.cash / totalMain) * 100 : 0;

  const components: BehavioralComponent[] = [];

  components.push({
    key: "diversification",
    label: "Diversification",
    weight: 0.18,
    score:
      positions.length === 0
        ? null
        : Math.round(
            clamp(
              (Math.min(positions.length, 8) / 8) * 60 +
                (Math.min(classes, 4) / 4) * 40
            )
          ),
    detail:
      positions.length === 0
        ? "No open positions yet"
        : `${positions.length} ${positions.length === 1 ? "holding" : "holdings"} across ${classes} asset ${classes === 1 ? "class" : "classes"}`,
  });

  components.push({
    key: "concentration",
    label: "Concentration control",
    weight: 0.18,
    score:
      positions.length === 0 || marketValue <= 0
        ? null
        : Math.round(clamp(100 - Math.max(0, largestWeight - 25) * (100 / 55))),
    detail:
      positions.length === 0
        ? "No invested capital to measure"
        : `Largest holding is ${largestWeight.toFixed(1)}% of invested value`,
  });

  components.push({
    key: "cost",
    label: "Cost discipline",
    weight: 0.14,
    score:
      orders.length === 0 || grossNotional <= 0
        ? null
        : Math.round(clamp(100 - costRatio * 2500)),
    detail:
      orders.length === 0
        ? "No fills yet"
        : `${(costRatio * 100).toFixed(2)}% of traded value went to fees and tax`,
  });

  const cadenceScore = clamp(
    100 - Math.max(0, orders.length / Math.max(1, activeDays) - 3) * 10
  );
  const turnoverScore = clamp(100 - Math.max(0, turnover - 10) * 2);
  components.push({
    key: "churn",
    label: "Churn control",
    weight: 0.14,
    score: orders.length === 0 ? null : Math.round(Math.min(cadenceScore, turnoverScore)),
    detail:
      orders.length === 0
        ? "No trading cadence yet"
        : `${plural(orders.length, "fill")} over ${plural(activeDays, "active day")} · ${turnover.toFixed(1)}× starting capital traded`,
  });

  components.push({
    key: "cash",
    label: "Cash buffer",
    weight: 0.1,
    score: totalMain <= 0 ? null : Math.round(clamp((cashPct / 25) * 100)),
    detail:
      totalMain <= 0
        ? "No account balance"
        : `${cashPct.toFixed(1)}% of the main account is held in cash`,
  });

  const learningActive =
    learning.modulesDone > 0 || learning.crashDrills > 0 || user.streak > 1;
  components.push({
    key: "learning",
    label: "Learning follow-through",
    weight: 0.18,
    score: learningActive
      ? Math.round(
          clamp(
            (Math.min(learning.modulesDone, 6) / 6) * 60 +
              learning.avgQuiz * 0.3 +
              (user.crash_done ? 10 : 0) +
              Math.min(user.streak, 10)
          )
        )
      : null,
    detail: learningActive
      ? `${plural(learning.modulesDone, "module")} completed · average quiz ${learning.avgQuiz.toFixed(0)}% · crash drill ${user.crash_done ? "done" : "not done"}`
      : "No learning activity recorded yet",
  });

  components.push({
    key: "winrate",
    label: "Closed-trade win rate",
    weight: 0.08,
    score: sells.length === 0 ? null : Math.round((winningSells / sells.length) * 100),
    detail:
      sells.length === 0
        ? "No sells yet"
        : `${winningSells} of ${plural(sells.length, "sell")} closed at a taxable gain`,
  });

  const scored = components.filter(
    (c): c is BehavioralComponent & { score: number } => c.score !== null
  );
  const availableWeight = scored.reduce((sum, c) => sum + c.weight, 0);
  const score =
    availableWeight > 0
      ? Math.round(scored.reduce((sum, c) => sum + c.score * c.weight, 0) / availableWeight)
      : null;
  const coverage = Math.round(availableWeight * 100);

  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const highlights = ranked.slice(0, 2).map((c) => `${c.label}: ${c.detail}.`);
  const cautions = ranked
    .slice(-2)
    .filter((c) => c.score < 70)
    .reverse()
    .map((c) => `${c.label}: ${c.detail}.`);

  if (highlights.length === 0) {
    highlights.push("No behavioural signals yet — place a trade or complete a module to start the index.");
  }
  if (cautions.length === 0) {
    cautions.push("No weak signals in the current record. Keep building a longer history.");
  }

  const metrics: BehavioralMetrics = {
    orders: orders.length,
    activeDays,
    grossNotional,
    turnover,
    fees,
    tax,
    costRatio,
    positions: positions.length,
    classes,
    largestWeight,
    cashPct,
    sells: sells.length,
    winningSells,
    modulesDone: learning.modulesDone,
    avgQuiz: learning.avgQuiz,
    crashDone: Boolean(user.crash_done),
    crashDrills: learning.crashDrills,
    streak: user.streak,
  };

  return {
    score,
    band: bandFor(score, coverage),
    coverage,
    components,
    highlights,
    cautions,
    metrics,
  };
}

function buildAnalysis(
  user: PublicUser,
  portfolio: Portfolio,
  behavioral: BehavioralIndex,
  learning: LearningRow,
  rank: { rank: number; returnPct: number } | null,
  history: ReportHistory,
  generatedAt: number
): string[] {
  const region = user.region;
  const positions = portfolio.positions;
  const totalMain = portfolio.cash + portfolio.marketValue;
  const out: string[] = [];

  if (positions.length === 0) {
    out.push(
      `No open positions. The entire main-account balance of ${fmtMoney(portfolio.cash, region)} is held in cash, so the behavioural index is still forming.`
    );
  } else {
    const investedPct = totalMain > 0 ? (portfolio.marketValue / totalMain) * 100 : 0;
    out.push(
      `You hold ${plural(positions.length, "position")} worth ${fmtMoney(portfolio.marketValue, region)} — ${investedPct.toFixed(1)}% of the ${fmtMoney(totalMain, region)} main account.`
    );

    const topClass = portfolio.allocation
      .filter((a) => a.key !== "cash")
      .sort((a, b) => b.value - a.value)[0];
    const cashAlloc = portfolio.allocation.find((a) => a.key === "cash");
    if (topClass) {
      out.push(
        `Largest allocation is ${topClass.label} at ${topClass.pct.toFixed(1)}% of the main account, with ${(cashAlloc?.pct ?? 0).toFixed(1)}% in cash.`
      );
    }

    const pnlPct = portfolio.invested > 0 ? (portfolio.unrealized / portfolio.invested) * 100 : 0;
    out.push(
      `Unrealised P&L is ${portfolio.unrealized >= 0 ? "+" : ""}${fmtMoney(portfolio.unrealized, region)} (${fmtPct(pnlPct)}) against ${fmtMoney(portfolio.invested, region)} invested; realised P&L is ${portfolio.realized >= 0 ? "+" : ""}${fmtMoney(portfolio.realized, region)}.`
    );

    if (behavioral.metrics.largestWeight > 0) {
      out.push(
        `The largest single holding is ${behavioral.metrics.largestWeight.toFixed(1)}% of invested value${behavioral.metrics.largestWeight > 40 ? " — concentration risk is elevated." : "."}`
      );
    }
  }

  if (behavioral.metrics.orders > 0) {
    out.push(
      `Trading activity: ${plural(behavioral.metrics.orders, "fill")} across ${plural(behavioral.metrics.activeDays, "active day")}, turning over ${behavioral.metrics.turnover.toFixed(1)}× starting capital. Fees and tax total ${fmtMoney(behavioral.metrics.fees + behavioral.metrics.tax, region)} (${(behavioral.metrics.costRatio * 100).toFixed(2)}% of traded value).`
    );
  } else {
    out.push("No executions yet, so cost, churn and win-rate signals are not scored.");
  }

  out.push(
    `Behavioural index: ${behavioral.score ?? "—"}/100${behavioral.score !== null ? ` (${behavioral.band})` : ""} with ${behavioral.coverage}% signal coverage.`
  );

  out.push(
    `Learning record: ${plural(learning.modulesDone, "module")} completed${learning.avgQuiz > 0 ? ` at an average quiz score of ${learning.avgQuiz.toFixed(0)}%` : ""}; crash drill ${user.crash_done ? "completed" : "not completed"}; ${plural(user.streak, "day")} streak.`
  );

  if (rank) {
    out.push(
      `Leaderboard rank: #${rank.rank} with a ${fmtPct(rank.returnPct)} return on starting capital.`
    );
  }

  if (history.points > 1 && history.changePct !== null) {
    out.push(
      `Current holdings are ${fmtPct(history.changePct)} across the available ${history.points}-point mark-to-market history (cash excluded).`
    );
  }

  out.push(
    `All figures are simulated and were generated on ${new Date(generatedAt).toLocaleString("en-US")}.`
  );

  return out;
}

export function buildPortfolioReport(
  user: PublicUser,
  inputs: {
    portfolio?: Portfolio;
    history?: Array<{ t: number; v: number }>;
    orders?: ReportOrder[];
    transactions?: ReportTransaction[];
    rank?: { rank: number; returnPct: number } | null;
  } = {}
): PortfolioReport {
  const portfolio = inputs.portfolio ?? getPortfolio(user);
  const historyRows = inputs.history ?? getPortfolioHistory(user, 180);
  const orders = (inputs.orders ?? getOrders(user.id, 5000)) as ReportOrder[];
  const transactions = (inputs.transactions ?? getTransactions(user.id, 5000)) as ReportTransaction[];
  const rankRow = inputs.rank === undefined ? getUserRank(user.id) : inputs.rank;
  const rank = rankRow ? { rank: rankRow.rank, returnPct: rankRow.returnPct } : null;
  const learning = getLearning(user.id);
  const behavioral = buildBehavioralIndex(user, portfolio, orders, learning);
  const generatedAt = Date.now();

  const first = historyRows.length > 0 ? historyRows[0].v : null;
  const last = historyRows.length > 0 ? historyRows[historyRows.length - 1].v : null;
  const history: ReportHistory = {
    points: historyRows.length,
    first,
    last,
    changePct: first !== null && first > 0 && last !== null ? ((last - first) / first) * 100 : null,
  };

  return {
    generatedAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      region: user.region,
      mode: user.mode,
      startCapital: user.start_capital,
      cash: user.cash,
      cryptoCash: user.crypto_cash,
      credits: user.credits,
      xp: user.xp,
      streak: user.streak,
      verified: Boolean(user.id_verified),
      createdAt: user.created_at,
    },
    portfolio: {
      positions: portfolio.positions,
      crypto: portfolio.crypto,
      cash: portfolio.cash,
      cryptoCash: portfolio.cryptoCash,
      invested: portfolio.invested,
      marketValue: portfolio.marketValue,
      cryptoValue: portfolio.cryptoValue,
      total: portfolio.total,
      dayChange: portfolio.dayChange,
      dayPct: portfolio.dayPct,
      unrealized: portfolio.unrealized,
      realized: portfolio.realized,
      feesPaid: portfolio.feesPaid,
      taxPaid: portfolio.taxPaid,
      allocation: portfolio.allocation,
    },
    behavioral,
    analysis: buildAnalysis(user, portfolio, behavioral, learning, rank, history, generatedAt),
    history,
    rank,
    orders,
    transactions,
  };
}
