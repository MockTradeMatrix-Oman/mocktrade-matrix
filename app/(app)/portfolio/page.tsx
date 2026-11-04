import { requireUser } from "@/lib/auth";
import {
  getOrders, getPortfolio, getPortfolioHistory, getPredictionStats, getTransactions, getUserRank,
} from "@/lib/data";
import { buildPortfolioReport } from "@/lib/report";
import { PortfolioView, type PortfolioOrder, type PortfolioTx } from "@/components/portfolio-view";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await requireUser();
  const portfolio = getPortfolio(user);
  const history = getPortfolioHistory(user, 180);
  const allOrders = getOrders(user.id, 5000) as PortfolioOrder[];
  const allTransactions = getTransactions(user.id, 5000) as PortfolioTx[];
  const orders = allOrders.slice(0, 40);
  const transactions = allTransactions.slice(0, 40);
  const rankRow = getUserRank(user.id);
  const accuracy = getPredictionStats().accuracy;
  const report = buildPortfolioReport(user, {
    portfolio,
    history,
    orders: allOrders,
    transactions: allTransactions,
    rank: rankRow ? { rank: rankRow.rank, returnPct: rankRow.returnPct } : null,
  });

  return (
    <PortfolioView
      portfolio={{
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
      }}
      history={history}
      orders={orders}
      transactions={transactions}
      region={user.region}
      rank={rankRow ? { rank: rankRow.rank, returnPct: rankRow.returnPct, xp: user.xp } : null}
      accuracy={accuracy}
      behavioral={report.behavioral}
      analysis={report.analysis}
    />
  );
}
