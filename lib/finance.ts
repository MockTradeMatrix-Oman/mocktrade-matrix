export const FX_INR = 83.2;

export type Region = "IN" | "US";

export function currencyOf(region: string) {
  return region === "IN" ? "₹" : "$";
}

/** Convert a USD-quoted price into the user's local currency. */
export function toLocal(usd: number, region: string) {
  return region === "IN" ? usd * FX_INR : usd;
}
export function toUsd(local: number, region: string) {
  return region === "IN" ? local / FX_INR : local;
}

export function fmtMoney(value: number, region: string, compact = false) {
  const symbol = currencyOf(region);
  const abs = Math.abs(value);
  if (compact && abs >= 10_000_000) return `${value < 0 ? "-" : ""}${symbol}${(abs / 10_000_000).toFixed(2)}Cr`;
  if (compact && abs >= 100_000) return `${value < 0 ? "-" : ""}${symbol}${(abs / 100_000).toFixed(2)}L`;
  const digits = abs >= 1000 ? 0 : 2;
  return `${value < 0 ? "-" : ""}${symbol}${abs.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function fmtNum(value: number, digits = 2) {
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(value: number, digits = 2) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function fmtQty(qty: number) {
  if (qty >= 1000) return qty.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (qty < 1) return qty.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return qty.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export const BROKERAGE: Record<string, number> = {
  stock: 0.0025,
  fund: 0.005,
  etf: 0.002,
  insurance: 0.01,
  crypto: 0.01,
};

export const TAX: Record<string, { IN: number; US: number }> = {
  stock: { IN: 0.15, US: 0.2 },
  fund: { IN: 0.15, US: 0.2 },
  etf: { IN: 0.15, US: 0.2 },
  insurance: { IN: 0.3, US: 0.25 },
  crypto: { IN: 0.3, US: 0.25 },
};

export function minFee(region: string) {
  return region === "IN" ? 5 : 0.5;
}

export function brokerageFor(cls: string, notional: number, region: string) {
  return Math.max(notional * (BROKERAGE[cls] ?? 0.0025), minFee(region));
}

export function taxFor(cls: string, gain: number, region: string) {
  return Math.max(0, gain) * (TAX[cls]?.[region as Region] ?? 0.2);
}

export function slipRate(cls: string) {
  const base = cls === "crypto" ? 0.0035 : 0.0015;
  return base * (0.4 + Math.random() * 1.2);
}

export type OrderEstimate = {
  priceLocal: number;
  executedLocal: number;
  notional: number;
  fee: number;
  tax: number;
  total: number;
  slippage: number;
};

export function estimateOrder(opts: {
  side: "BUY" | "SELL";
  qty: number;
  priceUsd: number;
  cls: string;
  region: string;
  avgPriceUsd?: number;
  slip?: number;
}): OrderEstimate {
  const { side, qty, priceUsd, cls, region, avgPriceUsd = priceUsd } = opts;
  const slip = opts.slip ?? slipRate(cls);
  const priceLocal = toLocal(priceUsd, region);
  const executedLocal = priceLocal * (side === "BUY" ? 1 + slip : 1 - slip);
  const notional = executedLocal * qty;
  const fee = brokerageFor(cls, notional, region);
  const gainLocal = (priceUsd - avgPriceUsd) * qty * (region === "IN" ? FX_INR : 1);
  const tax = side === "SELL" ? taxFor(cls, gainLocal, region) : 0;
  const total = side === "BUY" ? notional + fee : notional - fee - tax;
  return { priceLocal, executedLocal, notional, fee, tax, total, slippage: Math.abs(executedLocal - priceLocal) * qty };
}

export const CLASS_META: Record<string, { label: string; short: string; tone: string }> = {
  stock: { label: "Stocks", short: "EQ", tone: "emerald" },
  fund: { label: "Mutual Funds", short: "MF", tone: "violet" },
  etf: { label: "ETFs", short: "ETF", tone: "cyan" },
  insurance: { label: "Insurance", short: "INS", tone: "amber" },
  crypto: { label: "Crypto Sandbox", short: "CRY", tone: "red" },
};

export const MODES: Array<{ id: string; name: string; tagline: string; description: string }> = [
  { id: "student", name: "Student / Learner", tagline: "Classroom pace", description: "Structured financial education, module by module, built for a classroom pace." },
  { id: "beginner", name: "Beginner Investor", tagline: "Fundamentals first", description: "Learn the fundamentals before ever risking real money." },
  { id: "aspiring", name: "Aspiring Trader", tagline: "Under pressure", description: "Practise strategies and risk management under real market pressure." },
  { id: "programmer", name: "Programmer", tagline: "IF / ELSE markets", description: "Build and backtest algorithmic strategies with the Rule Builder." },
  { id: "experienced", name: "Experienced Investor", tagline: "Stress-test ideas", description: "Stress-test strategies and scenarios without risking real capital." },
  { id: "institution", name: "Institution", tagline: "Teams & classes", description: "Classroom and team competitions for learners of any age." },
];

export function modeName(id: string) {
  return MODES.find((m) => m.id === id)?.name ?? "Learner";
}

export function levelFromXp(xp: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
  const floor = (level - 1) ** 2 * 100;
  const ceil = level ** 2 * 100;
  return { level, floor, ceil, progress: Math.min(1, (xp - floor) / Math.max(1, ceil - floor)) };
}

export function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
