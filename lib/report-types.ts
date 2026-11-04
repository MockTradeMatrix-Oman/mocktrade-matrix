/**
 * Shared report types. Kept free of server-only imports so client components
 * can consume the same shapes as the report builder.
 */

export type BehavioralComponent = {
  key: string;
  label: string;
  score: number | null;
  weight: number;
  detail: string;
};

export type BehavioralMetrics = {
  orders: number;
  activeDays: number;
  grossNotional: number;
  turnover: number;
  fees: number;
  tax: number;
  costRatio: number;
  positions: number;
  classes: number;
  largestWeight: number;
  cashPct: number;
  sells: number;
  winningSells: number;
  modulesDone: number;
  avgQuiz: number;
  crashDone: boolean;
  crashDrills: number;
  streak: number;
};

export type BehavioralIndex = {
  score: number | null;
  band: string;
  coverage: number;
  components: BehavioralComponent[];
  highlights: string[];
  cautions: string[];
  metrics: BehavioralMetrics;
};

export type ReportPosition = {
  symbol: string;
  name: string;
  class: string;
  sector: string | null;
  region: string;
  qty: number;
  avgUsd: number;
  avgLocal: number;
  priceUsd: number;
  priceLocal: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
  dayPct: number;
  realized: number;
  bucket: string;
  esg: number;
  sentiment: number;
  headline: string | null;
};

export type ReportPortfolio = {
  positions: ReportPosition[];
  crypto: ReportPosition[];
  cash: number;
  cryptoCash: number;
  invested: number;
  marketValue: number;
  cryptoValue: number;
  total: number;
  dayChange: number;
  dayPct: number;
  unrealized: number;
  realized: number;
  feesPaid: number;
  taxPaid: number;
  allocation: Array<{ key: string; label: string; value: number; pct: number }>;
};

export type ReportOrder = {
  id: number;
  symbol: string;
  name: string;
  side: string;
  qty: number;
  executed_price: number;
  notional: number;
  fee: number;
  tax: number;
  source: string;
  created_at: number;
};

export type ReportTransaction = {
  id: number;
  kind: string;
  amount: number;
  bucket: string;
  note: string;
  created_at: number;
};

export type ReportHistory = {
  points: number;
  first: number | null;
  last: number | null;
  changePct: number | null;
};

export type PortfolioReport = {
  generatedAt: number;
  user: {
    id: number;
    name: string;
    email: string;
    region: string;
    mode: string;
    startCapital: number;
    cash: number;
    cryptoCash: number;
    credits: number;
    xp: number;
    streak: number;
    verified: boolean;
    createdAt: number;
  };
  portfolio: ReportPortfolio;
  behavioral: BehavioralIndex;
  analysis: string[];
  history: ReportHistory;
  rank: { rank: number; returnPct: number } | null;
  orders: ReportOrder[];
  transactions: ReportTransaction[];
};
