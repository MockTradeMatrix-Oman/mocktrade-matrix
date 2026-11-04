import type { Asset } from "./db";

export function sma(values: number[], period: number) {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function rsi(values: number[], period = 14) {
  if (values.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export type Forecast = {
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  target: number;
  score: number;
  rsi: number;
  momentum: number;
  drivers: string[];
};

export function forecast(asset: Asset, closes: number[]): Forecast {
  const last = closes[closes.length - 1] || asset.price;
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const momentum = last / (s20 || last) - 1;
  const trend = s20 >= s50 ? 1 : -1;
  const r = rsi(closes);
  const rsiSignal = (r - 50) / 50;
  const sentiment = asset.sentiment ?? 0;

  const raw = 2.4 * momentum + 0.32 * trend + 0.22 * rsiSignal + 0.55 * sentiment;
  const score = Math.tanh(raw);
  const confidence = Math.min(0.645, Math.max(0.508, 0.5 + Math.abs(score) * 0.135 + Math.random() * 0.018));
  const direction: Forecast["direction"] = score > 0.07 ? "bullish" : score < -0.07 ? "bearish" : "neutral";
  const target = last * (1 + score * 0.038);

  const drivers: string[] = [];
  if (momentum > 0.004) drivers.push(`Price ${(momentum * 100).toFixed(1)}% above its 20-day average`);
  else if (momentum < -0.004) drivers.push(`Price ${(Math.abs(momentum) * 100).toFixed(1)}% below its 20-day average`);
  else drivers.push("Price is hugging its 20-day average");
  drivers.push(s20 >= s50 ? "20-day trend above the 50-day trend" : "20-day trend below the 50-day trend");
  if (r > 68) drivers.push(`RSI ${r.toFixed(0)} — stretched, mean-reversion risk`);
  else if (r < 32) drivers.push(`RSI ${r.toFixed(0)} — oversold, bounce potential`);
  else drivers.push(`RSI ${r.toFixed(0)} — neutral zone`);
  drivers.push(
    sentiment > 0.15 ? "Headline sentiment is supportive" : sentiment < -0.15 ? "Headline sentiment is negative" : "Headline sentiment is mixed"
  );

  return { direction, confidence, target, score, rsi: r, momentum, drivers };
}

const GOOD = [
  "{name} extends its run as institutional flows stay positive",
  "Analysts raise {name} outlook after a stronger-than-expected quarter",
  "{name} guidance points to resilient demand into next year",
  "Quiet accumulation detected in {name} order flow",
  "{name} announces a buyback, tightening the free float",
];
const BAD = [
  "{name} slips as margin pressure surprises the street",
  "Regulatory scrutiny weighs on {name} sentiment",
  "{name} downgraded on valuation and slowing growth",
  "Supply-chain worries drag {name} lower in early trade",
  "Insider selling raises questions around {name}",
];
const NEUTRAL = [
  "{name} trades sideways as traders wait for the next catalyst",
  "Mixed signals: {name} holds support but volume is thin",
  "{name} consolidates after a volatile week",
  "Desk chatter is split on {name} ahead of earnings",
];

export function nextHeadline(asset: Asset) {
  const current = asset.sentiment ?? 0;
  const roll = Math.random();
  let next = current + (roll - 0.5) * 0.55;
  if (Math.random() < 0.12) next += Math.random() < 0.5 ? 0.45 : -0.45;
  next = Math.max(-1, Math.min(1, next));
  const pool = next > 0.14 ? GOOD : next < -0.14 ? BAD : NEUTRAL;
  const headline = pool[Math.floor(Math.random() * pool.length)].replace("{name}", asset.name);
  return { sentiment: next, headline };
}

export function sentimentLabel(v: number) {
  if (v > 0.35) return "Very positive";
  if (v > 0.1) return "Positive";
  if (v < -0.35) return "Very negative";
  if (v < -0.1) return "Negative";
  return "Neutral";
}
