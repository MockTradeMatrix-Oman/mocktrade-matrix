import "server-only";
import { all, one, type Asset, type Holding, type Module, type Prediction, type User } from "./db";
import { toLocal } from "./finance";

export type Position = {
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

export type Portfolio = {
  positions: Position[];
  crypto: Position[];
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

type Row = Holding & { name: string; class: string; sector: string | null; region: string; price: number; prev_close: number; esg: number; sentiment: number; headline: string | null };

export function getPortfolio(user: Pick<User, "id" | "region" | "cash" | "crypto_cash">): Portfolio {
  const rows = all<Row>(
    `SELECT h.*, a.name, a.class, a.sector, a.region, a.price, a.prev_close, a.esg, a.sentiment, a.headline
     FROM holdings h JOIN assets a ON a.symbol = h.symbol
     WHERE h.user_id = ? AND h.qty > 0.0000001`,
    user.id
  );
  const region = user.region;
  const positions: Position[] = [];
  const crypto: Position[] = [];

  for (const r of rows) {
    const priceLocal = toLocal(r.price, region);
    const avgLocal = toLocal(r.avg_price, region);
    const value = priceLocal * r.qty;
    const cost = avgLocal * r.qty;
    const dayChange = toLocal(r.price - r.prev_close, region) * r.qty;
    const pos: Position = {
      symbol: r.symbol, name: r.name, class: r.class, sector: r.sector, region: r.region,
      qty: r.qty, avgUsd: r.avg_price, avgLocal, priceUsd: r.price, priceLocal,
      value, cost, pnl: value - cost, pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
      dayChange, dayPct: r.prev_close > 0 ? ((r.price - r.prev_close) / r.prev_close) * 100 : 0,
      realized: r.realized, bucket: r.bucket, esg: r.esg, sentiment: r.sentiment, headline: r.headline,
    };
    if (r.bucket === "crypto") crypto.push(pos);
    else positions.push(pos);
  }

  positions.sort((a, b) => b.value - a.value);
  crypto.sort((a, b) => b.value - a.value);

  const marketValue = positions.reduce((s, p) => s + p.value, 0);
  const cryptoValue = crypto.reduce((s, p) => s + p.value, 0);
  const invested = positions.reduce((s, p) => s + p.cost, 0);
  const dayChange = positions.reduce((s, p) => s + p.dayChange, 0);
  const unrealized = marketValue - invested;
  const realized = positions.reduce((s, p) => s + p.realized, 0);
  const total = user.cash + marketValue;

  const byClass = new Map<string, number>();
  for (const p of positions) byClass.set(p.class, (byClass.get(p.class) ?? 0) + p.value);
  const labels: Record<string, string> = {
    stock: "Stocks", fund: "Mutual Funds", etf: "ETFs", insurance: "Insurance",
  };
  const allocation = Array.from(byClass.entries()).map(([key, value]) => ({
    key, label: labels[key] ?? key, value, pct: marketValue > 0 ? (value / marketValue) * 100 : 0,
  }));
  if (user.cash > 0) {
    allocation.push({ key: "cash", label: "Cash", value: user.cash, pct: total > 0 ? (user.cash / total) * 100 : 0 });
  }
  const allocTotal = allocation.reduce((s, a) => s + a.value, 0);
  for (const a of allocation) a.pct = allocTotal > 0 ? (a.value / allocTotal) * 100 : 0;
  allocation.sort((a, b) => b.value - a.value);

  const fees = one<{ fee: number; tax: number }>(
    "SELECT COALESCE(SUM(fee),0) AS fee, COALESCE(SUM(tax),0) AS tax FROM orders WHERE user_id = ?",
    user.id
  );

  return {
    positions, crypto, cash: user.cash, cryptoCash: user.crypto_cash, invested, marketValue, cryptoValue,
    total, dayChange, dayPct: total - dayChange > 0 ? (dayChange / (total - dayChange)) * 100 : 0,
    unrealized, realized, feesPaid: fees?.fee ?? 0, taxPaid: fees?.tax ?? 0, allocation,
  };
}

export function getAssets(cls?: string) {
  return cls
    ? all<Asset>("SELECT * FROM assets WHERE class = ? ORDER BY region, name", cls)
    : all<Asset>("SELECT * FROM assets ORDER BY class, region, name");
}

export function getAsset(symbol: string) {
  return one<Asset>("SELECT * FROM assets WHERE symbol = ?", symbol);
}

export function getCandles(symbol: string, days = 220) {
  return all<{ t: number; o: number; h: number; l: number; c: number }>(
    "SELECT t,o,h,l,c FROM candles WHERE symbol = ? ORDER BY t ASC",
    symbol
  ).slice(-days);
}

export type ModuleWithProgress = Module & { status: string; score: number; questions: number };

export function getModules(userId: number) {
  return all<ModuleWithProgress>(
    `SELECT m.*, COALESCE(p.status,'locked') AS status, COALESCE(p.score,0) AS score,
       (SELECT COUNT(*) FROM quiz_questions q WHERE q.module_id = m.id) AS questions
     FROM modules m
     LEFT JOIN module_progress p ON p.module_id = m.id AND p.user_id = ?
     WHERE m.is_published = 1
     ORDER BY m.order_index`,
    userId
  );
}

export function getModule(slug: string, userId: number) {
  const mod = one<Module>("SELECT * FROM modules WHERE slug = ? AND is_published = 1", slug);
  if (!mod) return null;
  const progress = one<{ status: string; score: number }>(
    "SELECT status, score FROM module_progress WHERE user_id = ? AND module_id = ?",
    userId, mod.id
  );
  const questions = all<{ id: number; prompt: string; options: string }>(
    "SELECT id, prompt, options FROM quiz_questions WHERE module_id = ? ORDER BY id",
    mod.id
  ).map((q) => ({ ...q, options: JSON.parse(q.options) as string[] }));
  const neighbours = all<Module>("SELECT * FROM modules WHERE is_published = 1 ORDER BY order_index");
  const idx = neighbours.findIndex((m) => m.id === mod.id);
  return {
    module: mod,
    status: progress?.status ?? "locked",
    score: progress?.score ?? 0,
    questions,
    prev: idx > 0 ? neighbours[idx - 1] : null,
    next: idx < neighbours.length - 1 ? neighbours[idx + 1] : null,
  };
}

export function getLeaderboard(region?: string, limit = 12) {
  // Only real learner accounts rank here — never the admin or demo data.
  const users = all<User>(
    `SELECT * FROM users WHERE role = 'user'${region ? " AND region = ?" : ""}`,
    ...(region ? [region] : [])
  );
  const rows = all<{ user_id: number; qty: number; price: number; bucket: string }>(
    "SELECT h.user_id, h.qty, a.price, h.bucket FROM holdings h JOIN assets a ON a.symbol = h.symbol WHERE h.qty > 0"
  );
  const valueByUser = new Map<number, number>();
  for (const r of rows) {
    if (r.bucket !== "main") continue;
    valueByUser.set(r.user_id, (valueByUser.get(r.user_id) ?? 0) + r.qty * r.price);
  }
  return users
    .map((u) => {
      const mv = (valueByUser.get(u.id) ?? 0) * (u.region === "IN" ? 83.2 : 1);
      const total = u.cash + mv;
      return {
        id: u.id, name: u.name, avatar: u.avatar, mode: u.mode, region: u.region,
        credits: u.credits, xp: u.xp, streak: u.streak,
        total, returnPct: u.start_capital > 0 ? ((total - u.start_capital) / u.start_capital) * 100 : 0,
      };
    })
    .sort((a, b) => b.returnPct - a.returnPct)
    .slice(0, limit)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

export function getNotifications(userId: number, limit = 10) {
  return all<{ id: number; type: string; title: string; body: string; read: number; created_at: number }>(
    "SELECT id,type,title,body,read,created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    userId, limit
  );
}

export function getActivity(limit = 8) {
  return all<{ id: number; type: string; text: string; created_at: number; name: string; avatar: string }>(
    `SELECT a.id, a.type, a.text, a.created_at, COALESCE(u.name,'MockTrade') AS name, COALESCE(u.avatar,'MT') AS avatar
     FROM activity a LEFT JOIN users u ON u.id = a.user_id
     WHERE u.id IS NULL OR u.role = 'user'
     ORDER BY a.created_at DESC LIMIT ?`,
    limit
  );
}

export function getPredictionStats(symbol?: string) {
  const row = symbol
    ? one<{ total: number; correct: number }>(
        "SELECT COUNT(*) AS total, COALESCE(SUM(correct),0) AS correct FROM predictions WHERE resolved_at IS NOT NULL AND symbol = ?",
        symbol
      )
    : one<{ total: number; correct: number }>(
        "SELECT COUNT(*) AS total, COALESCE(SUM(correct),0) AS correct FROM predictions WHERE resolved_at IS NOT NULL"
      );
  const total = row?.total ?? 0;
  const correct = row?.correct ?? 0;
  return { total, correct, accuracy: total > 0 ? (correct / total) * 100 : 0 };
}

export function getActivePrediction(symbol: string) {
  return one<Prediction>(
    "SELECT * FROM predictions WHERE symbol = ? AND resolved_at IS NULL ORDER BY created_at DESC LIMIT 1",
    symbol
  );
}

export function getFeaturedPrediction() {
  return one<Prediction & { name: string; class: string }>(
    `SELECT p.*, a.name, a.class FROM predictions p JOIN assets a ON a.symbol = p.symbol
     WHERE p.resolved_at IS NULL ORDER BY p.confidence DESC LIMIT 1`
  );
}

export function getPortfolioHistory(user: { id: number; cash: number; region: string }, days = 30) {
  const holdings = all<{ symbol: string; qty: number }>(
    "SELECT symbol, qty FROM holdings WHERE user_id = ? AND bucket = 'main' AND qty > 0",
    user.id
  );
  if (!holdings.length) return [];
  const fx = user.region === "IN" ? 83.2 : 1;
  const series = new Map<number, number>();
  for (const h of holdings) {
    const rows = all<{ t: number; c: number }>(
      "SELECT t, c FROM candles WHERE symbol = ? ORDER BY t DESC LIMIT ?",
      h.symbol, days
    ).reverse();
    for (const r of rows) {
      series.set(r.t, (series.get(r.t) ?? 0) + r.c * h.qty * fx);
    }
  }
  return Array.from(series.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, v]) => ({ t, v }));
}

export function getRecentPredictions(limit = 6) {
  return all<Prediction & { name: string }>(
    `SELECT p.*, a.name FROM predictions p JOIN assets a ON a.symbol = p.symbol
     WHERE p.resolved_at IS NOT NULL ORDER BY p.resolved_at DESC LIMIT ?`,
    limit
  );
}

export function getOrders(userId: number, limit = 20) {
  return all<{
    id: number; symbol: string; side: string; qty: number; executed_price: number; notional: number;
    fee: number; tax: number; source: string; created_at: number; name: string;
  }>(
    `SELECT o.id,o.symbol,o.side,o.qty,o.executed_price,o.notional,o.fee,o.tax,o.source,o.created_at,a.name
     FROM orders o JOIN assets a ON a.symbol = o.symbol WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT ?`,
    userId, limit
  );
}

export function getTransactions(userId: number, limit = 20) {
  return all<{ id: number; kind: string; amount: number; bucket: string; note: string; created_at: number }>(
    "SELECT id,kind,amount,bucket,note,created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    userId, limit
  );
}

export type FriendRow = {
  id: number; requester: number; addressee: number; status: string; created_at: number;
  other_id: number; name: string; avatar: string; mode: string; region: string; credits: number; xp: number;
};

export function getFriends(userId: number) {
  return all<FriendRow>(
    `SELECT f.*, u.id AS other_id, u.name, u.avatar, u.mode, u.region, u.credits, u.xp
     FROM friends f
     JOIN users u ON u.id = CASE WHEN f.requester = ? THEN f.addressee ELSE f.requester END
     WHERE f.requester = ? OR f.addressee = ?
     ORDER BY f.created_at DESC`,
    userId, userId, userId
  );
}

export function getRules(userId: number) {
  return all<{
    id: number; name: string; symbol: string; conditions: string; action: string;
    active: number; trigger_count: number; last_triggered: number | null; created_at: number; asset_name: string;
  }>(
    `SELECT r.*, a.name AS asset_name FROM rules r JOIN assets a ON a.symbol = r.symbol
     WHERE r.user_id = ? ORDER BY r.created_at DESC`,
    userId
  );
}

export function getChallenges(userId: number, limit = 10) {
  return all<{
    id: number; host_id: number; guest_id: number | null; guest_name: string | null; is_bot: number;
    status: string; start_at: number; end_at: number; host_start: number; guest_start: number;
    host_value: number; guest_value: number; winner_id: number | null;
  }>(
    `SELECT * FROM challenges WHERE host_id = ? OR guest_id = ? ORDER BY created_at DESC LIMIT ?`,
    userId, userId, limit
  );
}

export function getClassrooms(userId: number) {
  return all<{
    id: number; name: string; owner_id: number; code: string; created_at: number;
    members: number; role: string;
  }>(
    `SELECT c.*, (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id) AS members,
       (SELECT role FROM classroom_members m WHERE m.classroom_id = c.id AND m.user_id = ?) AS role
     FROM classrooms c
     WHERE c.owner_id = ? OR EXISTS (SELECT 1 FROM classroom_members m WHERE m.classroom_id = c.id AND m.user_id = ?)
     ORDER BY c.created_at DESC`,
    userId, userId, userId
  );
}

export function getCrashEvents(userId: number) {
  return all<{ id: number; drawdown: number; triggered_at: number; recovered_at: number | null }>(
    "SELECT * FROM crash_events WHERE user_id = ? ORDER BY triggered_at DESC",
    userId
  );
}

export function getUnreadCount(userId: number) {
  return one<{ c: number }>("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0", userId)?.c ?? 0;
}

export function getUserRank(userId: number) {
  const board = getLeaderboard(undefined, 1000);
  return board.find((b) => b.id === userId) ?? null;
}

export function getClassroomLeaderboard(classroomId: number) {
  const members = all<{ id: number; name: string; avatar: string; credits: number; xp: number; region: string; cash: number; start_capital: number }>(
    `SELECT u.id,u.name,u.avatar,u.credits,u.xp,u.region,u.cash,u.start_capital
     FROM classroom_members m JOIN users u ON u.id = m.user_id WHERE m.classroom_id = ?`,
    classroomId
  );
  const rows = all<{ user_id: number; qty: number; price: number }>(
    `SELECT h.user_id, h.qty, a.price FROM holdings h JOIN assets a ON a.symbol = h.symbol
     WHERE h.bucket = 'main' AND h.user_id IN (SELECT user_id FROM classroom_members WHERE classroom_id = ?)`,
    classroomId
  );
  const mv = new Map<number, number>();
  for (const r of rows) mv.set(r.user_id, (mv.get(r.user_id) ?? 0) + r.qty * r.price);
  return members
    .map((m) => {
      const total = m.cash + (mv.get(m.id) ?? 0) * (m.region === "IN" ? 83.2 : 1);
      return { ...m, total, returnPct: ((total - m.start_capital) / m.start_capital) * 100 };
    })
    .sort((a, b) => b.returnPct - a.returnPct);
}
