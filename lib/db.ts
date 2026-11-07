import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";

const g = globalThis as any;
export const now = () => Date.now();
export const DAY = 86_400_000;

export type User = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  mode: string;
  region: string;
  arena_region: string;
  avatar: string;
  credits: number;
  cash: number;
  crypto_cash: number;
  start_capital: number;
  xp: number;
  streak: number;
  /** Local calendar day (YYYY-MM-DD in the account timezone) of the last counted login. */
  last_streak_day: string | null;
  id_verified: number;
  verified_name: string | null;
  verified_address: string | null;
  institution_access: number;
  institution_granted_at: number | null;
  guardian_status: string;
  guardian_email: string | null;
  terms_accepted: number;
  crash_done: number;
  accent: string;
  dob: string | null;
  created_at: number;
  last_seen: number;
};

export type Asset = {
  symbol: string;
  name: string;
  class: string;
  region: string;
  sector: string | null;
  currency: string;
  price: number;
  prev_close: number;
  day_open: number;
  base_price: number;
  volatility: number;
  sentiment: number;
  headline: string | null;
  esg: number;
  about: string | null;
  updated_at: number;
};

export type Holding = {
  user_id: number;
  symbol: string;
  qty: number;
  avg_price: number;
  realized: number;
  bucket: string;
};

export type Order = {
  id: number;
  user_id: number;
  symbol: string;
  side: string;
  qty: number;
  requested_price: number;
  executed_price: number;
  notional: number;
  fee: number;
  tax: number;
  slippage: number;
  source: string;
  created_at: number;
};

export type Module = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  order_index: number;
  minutes: number;
  reward_credits: number;
  unlock_cost: number;
  video_seconds: number;
  video_url: string | null;
  content: string;
  is_free: number;
  is_published: number;
};

export type Prediction = {
  id: number;
  symbol: string;
  direction: string;
  confidence: number;
  start_price: number;
  target_price: number;
  horizon: string;
  created_at: number;
  resolve_at: number;
  resolved_at: number | null;
  end_price: number | null;
  correct: number | null;
};

/* ------------------------------------------------------------------ */
/* low-level helpers                                                   */
/* ------------------------------------------------------------------ */

export function all<T = any>(sql: string, ...params: any[]): T[] {
  return (db.prepare(sql).all(...params) as any[]).map((row) => ({ ...row })) as T[];
}
export function one<T = any>(sql: string, ...params: any[]): T | undefined {
  const row = db.prepare(sql).get(...params) as any;
  return row ? ({ ...row } as T) : undefined;
}
export function run(sql: string, ...params: any[]) {
  const r = db.prepare(sql).run(...params);
  return { changes: Number(r.changes), lastId: Number(r.lastInsertRowid) };
}
export function tx<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* schema                                                              */
/* ------------------------------------------------------------------ */

function migrate(d: DatabaseSync) {
  // busy_timeout must be set before anything that can take a write lock.
  d.exec("PRAGMA busy_timeout = 20000;");
  // Switching journal mode needs a write lock and returns SQLITE_BUSY
  // immediately (ignoring busy_timeout) if another process is connected.
  // Read the current mode first and only flip it when necessary.
  try {
    const current = (d.prepare("PRAGMA journal_mode").get() as { journal_mode?: string } | undefined)?.journal_mode;
    if (String(current ?? "").toLowerCase() !== "wal") d.exec("PRAGMA journal_mode = WAL;");
  } catch {
    /* another worker holds the lock — the file is already in WAL mode */
  }
  d.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      mode TEXT NOT NULL DEFAULT 'student',
      region TEXT NOT NULL DEFAULT 'IN',
      arena_region TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT 'MT',
      credits INTEGER NOT NULL DEFAULT 100,
      cash REAL NOT NULL DEFAULT 100000,
      crypto_cash REAL NOT NULL DEFAULT 15000,
      start_capital REAL NOT NULL DEFAULT 100000,
      xp INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 1,
      last_streak_day TEXT,
      id_verified INTEGER NOT NULL DEFAULT 0,
      guardian_status TEXT NOT NULL DEFAULT 'pending',
      guardian_email TEXT,
      terms_accepted INTEGER NOT NULL DEFAULT 0,
      crash_done INTEGER NOT NULL DEFAULT 0,
      accent TEXT NOT NULL DEFAULT 'emerald',
      dob TEXT,
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      symbol TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      class TEXT NOT NULL,
      region TEXT NOT NULL,
      sector TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      price REAL NOT NULL,
      prev_close REAL NOT NULL,
      day_open REAL NOT NULL,
      base_price REAL NOT NULL,
      volatility REAL NOT NULL,
      sentiment REAL NOT NULL DEFAULT 0,
      headline TEXT,
      esg INTEGER NOT NULL DEFAULT 50,
      about TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS candles (
      symbol TEXT NOT NULL,
      t INTEGER NOT NULL,
      o REAL NOT NULL, h REAL NOT NULL, l REAL NOT NULL, c REAL NOT NULL,
      PRIMARY KEY (symbol, t)
    );

    CREATE TABLE IF NOT EXISTS holdings (
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      qty REAL NOT NULL DEFAULT 0,
      avg_price REAL NOT NULL DEFAULT 0,
      realized REAL NOT NULL DEFAULT 0,
      bucket TEXT NOT NULL DEFAULT 'main',
      PRIMARY KEY (user_id, symbol)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      qty REAL NOT NULL,
      requested_price REAL NOT NULL,
      executed_price REAL NOT NULL,
      notional REAL NOT NULL,
      fee REAL NOT NULL,
      tax REAL NOT NULL,
      slippage REAL NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      amount REAL NOT NULL,
      bucket TEXT NOT NULL DEFAULT 'cash',
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      description TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'Foundation',
      order_index INTEGER NOT NULL,
      minutes INTEGER NOT NULL DEFAULT 8,
      reward_credits INTEGER NOT NULL DEFAULT 40,
      unlock_cost INTEGER NOT NULL DEFAULT 0,
      video_seconds INTEGER NOT NULL DEFAULT 300,
      video_url TEXT,
      content TEXT NOT NULL,
      is_free INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      options TEXT NOT NULL,
      correct INTEGER NOT NULL,
      explanation TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS module_progress (
      user_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'locked',
      score INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      PRIMARY KEY (user_id, module_id)
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guardian_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      guardian_email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      created_at INTEGER NOT NULL,
      decided_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      confidence REAL NOT NULL,
      start_price REAL NOT NULL,
      target_price REAL NOT NULL,
      horizon TEXT NOT NULL DEFAULT '1D',
      created_at INTEGER NOT NULL,
      resolve_at INTEGER NOT NULL,
      resolved_at INTEGER,
      end_price REAL,
      correct INTEGER
    );

    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      conditions TEXT NOT NULL,
      action TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      trigger_count INTEGER NOT NULL DEFAULT 0,
      last_triggered INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester INTEGER NOT NULL,
      addressee INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      UNIQUE(requester, addressee)
    );

    -- One-to-one messages between accepted friends. Kept when a friendship is
    -- removed so a learner never loses a conversation they already had.
    CREATE TABLE IF NOT EXISTS direct_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      read_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id INTEGER NOT NULL,
      guest_id INTEGER,
      guest_name TEXT,
      is_bot INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      start_at INTEGER NOT NULL,
      end_at INTEGER NOT NULL,
      host_start REAL NOT NULL,
      guest_start REAL NOT NULL,
      host_value REAL NOT NULL,
      guest_value REAL NOT NULL,
      winner_id INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL,
      user_id INTEGER,
      name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classrooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classroom_members (
      classroom_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (classroom_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      body TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL DEFAULT 'info',
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crash_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      drawdown REAL NOT NULL,
      triggered_at INTEGER NOT NULL,
      recovered_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS id_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doc_type TEXT NOT NULL,
      status TEXT NOT NULL,
      name TEXT,
      address TEXT,
      doc_hash TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 0,
      checks TEXT NOT NULL DEFAULT '{}',
      reasons TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shop_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pack_id TEXT NOT NULL,
      pack_name TEXT NOT NULL,
      credits INTEGER NOT NULL,
      cash_added REAL NOT NULL,
      crypto_added REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      classroom_id INTEGER,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      resolution TEXT,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS classroom_competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      classroom_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      starts_at INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      teams TEXT NOT NULL DEFAULT '{}',
      snapshot TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_powerups (
      user_id INTEGER NOT NULL,
      powerup_id TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, powerup_id)
    );

    CREATE TABLE IF NOT EXISTS arena_matches (
      id TEXT PRIMARY KEY,
      region TEXT NOT NULL,
      p1 INTEGER NOT NULL,
      p2 INTEGER NOT NULL,
      p1_name TEXT NOT NULL,
      p2_name TEXT NOT NULL,
      p1_region TEXT NOT NULL DEFAULT '',
      p2_region TEXT NOT NULL DEFAULT '',
      p1_score INTEGER NOT NULL DEFAULT 0,
      p2_score INTEGER NOT NULL DEFAULT 0,
      p1_correct INTEGER NOT NULL DEFAULT 0,
      p2_correct INTEGER NOT NULL DEFAULT 0,
      p1_ms INTEGER NOT NULL DEFAULT 0,
      p2_ms INTEGER NOT NULL DEFAULT 0,
      winner_id INTEGER,
      reason TEXT,
      credits_awarded INTEGER NOT NULL DEFAULT 0,
      questions INTEGER NOT NULL DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'live',
      started_at INTEGER NOT NULL,
      ended_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS arena_answers (
      match_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      q_index INTEGER NOT NULL,
      choice INTEGER,
      correct INTEGER NOT NULL DEFAULT 0,
      ms INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (match_id, user_id, q_index)
    );

    CREATE TABLE IF NOT EXISTS arena_stats (
      user_id INTEGER PRIMARY KEY,
      matches INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      answered INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      credits_won INTEGER NOT NULL DEFAULT 0,
      rating INTEGER NOT NULL DEFAULT 1000,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_candles_symbol ON candles(symbol, t);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);
    CREATE INDEX IF NOT EXISTS idx_predictions_symbol ON predictions(symbol, created_at);
    CREATE INDEX IF NOT EXISTS idx_id_docs_user ON id_documents(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_id_docs_hash ON id_documents(doc_hash, status);
    CREATE INDEX IF NOT EXISTS idx_shop_user ON shop_purchases(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_friends_pair ON friends(requester, addressee);
    CREATE INDEX IF NOT EXISTS idx_friends_addressee ON friends(addressee, status);
    CREATE INDEX IF NOT EXISTS idx_dm_thread ON direct_messages(sender_id, recipient_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_dm_unread ON direct_messages(recipient_id, read_at);
    CREATE INDEX IF NOT EXISTS idx_support_user ON support_requests(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_support_status ON support_requests(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_competitions_class ON classroom_competitions(classroom_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_arena_stats_credits ON arena_stats(credits_won DESC, wins DESC);
    CREATE INDEX IF NOT EXISTS idx_arena_matches_region ON arena_matches(region, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_arena_answers_match ON arena_answers(match_id);
    CREATE INDEX IF NOT EXISTS idx_powerups_user ON user_powerups(user_id);
  `);

  // Lightweight, additive migrations for databases created by earlier builds.
  // The streak day is tracked separately from last_seen so socket presence
  // updates cannot swallow a daily login.
  ensureColumn(d, "users", "last_streak_day", "TEXT");
  ensureColumn(d, "users", "verified_name", "TEXT");
  ensureColumn(d, "users", "verified_address", "TEXT");
  ensureColumn(d, "users", "institution_access", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(d, "users", "institution_granted_at", "INTEGER");
  const addedRole = ensureColumn(d, "users", "role", "TEXT NOT NULL DEFAULT 'user'");
  const addedVideo = ensureColumn(d, "modules", "video_url", "TEXT");
  ensureColumn(d, "modules", "is_published", "INTEGER NOT NULL DEFAULT 1");

  // Arena region is separate from the market region. Currency stays IN/US;
  // the quiz ladder is grouped by the learner's wider geographic region.
  ensureColumn(d, "users", "arena_region", "TEXT NOT NULL DEFAULT ''");
  d.prepare(
    "UPDATE users SET arena_region = CASE WHEN region = 'US' THEN 'US' ELSE 'IN' END WHERE arena_region IS NULL OR arena_region = ''"
  ).run();

  // Skill rating for global matchmaking. Seeded from historical results once.
  const addedRating = ensureColumn(d, "arena_stats", "rating", "INTEGER NOT NULL DEFAULT 1000");
  if (addedRating) {
    d.prepare(
      "UPDATE arena_stats SET rating = MAX(400, 1000 + wins * 24 - losses * 12 + draws * 4) WHERE matches > 0"
    ).run();
  }
  ensureColumn(d, "arena_matches", "p1_region", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(d, "arena_matches", "p2_region", "TEXT NOT NULL DEFAULT ''");
  if (addedRole) {
    d.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run("admin@mocktrade.app");
  }
  if (addedVideo) {
    d.prepare("UPDATE modules SET video_url = ? WHERE slug = ?").run(
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      "money-markets-risk"
    );
  }
}

function ensureColumn(d: DatabaseSync, table: string, column: string, ddl: string) {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === column)) return false;
  try {
    d.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  } catch (err) {
    // Two build workers can pass the PRAGMA check at the same time. The loser
    // sees "duplicate column name", which means the migration already applied.
    if (String((err as { message?: string })?.message || "").includes("duplicate column name")) return false;
    throw err;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* seed                                                                */
/* ------------------------------------------------------------------ */

type SeedAsset = [string, string, string, string, string, number, number, number, string, string];

const ASSETS: SeedAsset[] = [
  // symbol, name, class, region, sector, priceUSD, volatility, esg, about, color
  ["RELIANCE", "Reliance Industries", "stock", "IN", "Energy", 34.4, 0.011, 62, "India's largest conglomerate spanning energy, retail, telecom and new energy.", "emerald"],
  ["TCS", "Tata Consultancy Services", "stock", "IN", "Technology", 46.2, 0.008, 78, "Global IT services and consulting leader with deep enterprise moats.", "cyan"],
  ["HDFCBANK", "HDFC Bank", "stock", "IN", "Financials", 20.4, 0.009, 71, "India's largest private-sector bank by assets.", "violet"],
  ["INFY", "Infosys", "stock", "IN", "Technology", 21.3, 0.009, 80, "Digital transformation and consulting at global scale.", "cyan"],
  ["TATAMOTORS", "Tata Motors", "stock", "IN", "Automotive", 12.1, 0.016, 58, "Automotive major with a growing electric vehicle franchise.", "amber"],
  ["ADANIENT", "Adani Enterprises", "stock", "IN", "Conglomerate", 35.8, 0.02, 41, "Infrastructure and commodities incubator with high beta.", "amber"],
  ["ITC", "ITC Limited", "stock", "IN", "Consumer", 5.4, 0.007, 74, "FMCG, hotels and paperboards with a defensive cash profile.", "emerald"],
  ["SBIN", "State Bank of India", "stock", "IN", "Financials", 9.6, 0.012, 66, "India's largest public-sector bank.", "violet"],
  ["AAPL", "Apple Inc.", "stock", "US", "Technology", 232.4, 0.01, 72, "Consumer hardware and services ecosystem with enormous cash generation.", "cyan"],
  ["MSFT", "Microsoft", "stock", "US", "Technology", 428.6, 0.009, 79, "Cloud, productivity and AI infrastructure at enterprise scale.", "violet"],
  ["NVDA", "NVIDIA", "stock", "US", "Semiconductors", 138.2, 0.019, 68, "The compute layer of the AI build-out. High growth, high beta.", "emerald"],
  ["TSLA", "Tesla", "stock", "US", "Automotive", 251.7, 0.024, 54, "Electric vehicles, energy storage and autonomy optionality.", "red"],
  ["AMZN", "Amazon", "stock", "US", "Consumer", 186.3, 0.013, 65, "E-commerce logistics plus AWS cloud profitability.", "amber"],
  ["GOOGL", "Alphabet", "stock", "US", "Technology", 168.9, 0.012, 70, "Search, advertising, cloud and frontier AI research.", "cyan"],
  ["META", "Meta Platforms", "stock", "US", "Technology", 572.4, 0.014, 61, "Social graph monetisation and AI-driven ad targeting.", "violet"],
  ["JPM", "JPMorgan Chase", "stock", "US", "Financials", 221.8, 0.01, 63, "Global banking franchise with a fortress balance sheet.", "amber"],
  ["MF_BLUECHIP", "Bluechip Growth Fund", "fund", "GLOBAL", "Large cap", 28.4, 0.006, 76, "Professionally managed large-cap portfolio with low turnover.", "emerald"],
  ["MF_MIDCAP", "Midcap Momentum Fund", "fund", "GLOBAL", "Mid cap", 41.7, 0.011, 64, "Higher-growth mid-cap basket. More reward, more drawdown.", "amber"],
  ["MF_DEBT", "Stable Income Fund", "fund", "GLOBAL", "Debt", 12.8, 0.002, 82, "Short-duration debt fund built for capital preservation.", "cyan"],
  ["MF_INDEX", "Global Index Fund", "fund", "GLOBAL", "Index", 55.2, 0.007, 80, "Passive exposure to global equities at a low fee.", "violet"],
  ["ETF_NIFTY50", "Nifty 50 ETF", "etf", "GLOBAL", "Index", 27.9, 0.008, 75, "A single ticket to India's fifty largest listed companies.", "emerald"],
  ["ETF_GOLD", "Gold Hedge ETF", "etf", "GLOBAL", "Commodity", 71.5, 0.006, 60, "Gold exposure used as a hedge against equity drawdowns.", "amber"],
  ["ETF_NASDAQ100", "Nasdaq 100 ETF", "etf", "GLOBAL", "Index", 486.3, 0.011, 69, "The hundred largest non-financial companies on Nasdaq.", "cyan"],
  ["ETF_ESG", "ESG Leaders ETF", "etf", "GLOBAL", "ESG", 34.6, 0.008, 92, "Screened for environmental, social and governance leadership.", "emerald"],
  ["INS_LIFE", "SecureLife Policy", "insurance", "GLOBAL", "Life", 14.2, 0.003, 70, "Whole-life protection with a smoothed long-term return profile.", "violet"],
  ["INS_HEALTH", "HealthShield Policy", "insurance", "GLOBAL", "Health", 9.6, 0.002, 72, "Health cover mechanics: premiums in, protection out.", "cyan"],
  ["INS_TERM", "TermGuard Policy", "insurance", "GLOBAL", "Term", 4.8, 0.002, 68, "Pure protection. The cheapest way to insure a downside.", "emerald"],
  ["BTC", "Bitcoin", "crypto", "GLOBAL", "Digital asset", 68420, 0.03, 45, "Scarce digital asset with violent, headline-driven swings.", "amber"],
  ["ETH", "Ethereum", "crypto", "GLOBAL", "Smart contracts", 3245, 0.035, 52, "Programmable settlement layer for on-chain applications.", "violet"],
  ["SOL", "Solana", "crypto", "GLOBAL", "Smart contracts", 158.4, 0.045, 48, "High-throughput chain. Fast blocks, fast drawdowns.", "cyan"],
  ["DOGE", "Dogecoin", "crypto", "GLOBAL", "Meme", 0.162, 0.06, 30, "Community-driven asset. A masterclass in sentiment risk.", "red"],
];

const MODULES: Array<{
  slug: string; title: string; subtitle: string; description: string; level: string;
  minutes: number; reward: number; cost: number; seconds: number; free: number; content: string;
  quiz: Array<{ q: string; options: string[]; correct: number; why: string }>;
}> = [
  {
    slug: "money-markets-risk",
    title: "Money, Markets & Risk",
    subtitle: "Why prices exist, and who is on the other side.",
    description: "The mental model behind every trade: price is an agreement, risk is a position size, and the market owes you nothing.",
    level: "Foundation", minutes: 7, reward: 40, cost: 0, seconds: 420, free: 1,
    content: `A market is not a machine that makes you money. It is a continuous auction where every price is the last agreement between a buyer and a seller. When you buy, someone is selling. When you panic, someone is calmly taking the other side.\n\nThree ideas carry the whole course:\n\n• **Price is information, not truth.** It reflects what participants believe right now, not what an asset is worth forever.\n• **Risk is not volatility — it is the chance you cannot stay in the game.** Position sizing matters more than prediction.\n• **Returns compound, but so do mistakes.** Fees, taxes and impulsive decisions are also compounding forces.\n\nBefore your first trade, decide two numbers: how much you are willing to lose on the idea, and what would prove you wrong. If you cannot name both, you are not trading. You are guessing with extra steps.`,
    quiz: [
      { q: "What does a market price actually represent?", options: ["The true long-term value of an asset", "The last agreement between a buyer and a seller", "A guarantee set by the exchange", "The company's audited net worth"], correct: 1, why: "Price is the most recent transaction both sides accepted — information, not intrinsic truth." },
      { q: "Which statement best describes risk?", options: ["How often a price moves up and down", "The chance you are forced out before your thesis plays out", "The fee you pay per trade", "The number of shares you own"], correct: 1, why: "Survival risk dominates: if you cannot stay in the position, being right eventually does not help." },
      { q: "Before entering a trade you should know…", options: ["Only the upside target", "The maximum loss you accept and what invalidates the idea", "What a stranger on social media is buying", "The exact next candle colour"], correct: 1, why: "Defining loss and invalidation turns a guess into a risk-managed decision." },
    ],
  },
  {
    slug: "how-prices-move",
    title: "How Prices Actually Move",
    subtitle: "Order flow, liquidity and the physics of a tick.",
    description: "Learn why a stock jumps on news, why thin markets slip, and how to read a price chart without inventing stories.",
    level: "Foundation", minutes: 8, reward: 45, cost: 0, seconds: 480, free: 0,
    content: `Prices move when one side of the auction becomes impatient. If buyers are willing to pay the ask, the price ticks up. If sellers accept the bid, it ticks down. Volume is the evidence that a move has participants behind it.\n\n**Liquidity** is the market's ability to absorb your order without moving the price. A large order in a thin book does not execute at the screen price — it walks the book, filling at progressively worse levels. That gap between the price you wanted and the price you got is **slippage**, and this platform charges it on every order.\n\n**News** does not move prices directly. It changes expectations, which changes orders, which moves prices. Two companies can report identical numbers and react in opposite directions because the market had already priced different expectations.\n\nRead a chart as a record of decisions, not a prophecy. Higher highs with expanding volume suggest participation. A sharp move on no volume is often a trap. Your job is not to predict every wiggle — it is to identify where the odds are skewed and size accordingly.`,
    quiz: [
      { q: "What is slippage?", options: ["A fee charged by the broker", "The difference between the requested and executed price", "A tax on realised profits", "The spread between two exchanges"], correct: 1, why: "Slippage is execution drift — your order filled at a worse price than you saw." },
      { q: "A price rises on very thin volume. What should you suspect?", options: ["Strong institutional conviction", "A fragile move that may reverse easily", "A guaranteed breakout", "The company was acquired"], correct: 1, why: "Without volume, few participants validated the move. Thin moves are easier to reverse." },
      { q: "News moves prices because…", options: ["The exchange reprices assets automatically", "It changes expectations, which changes order flow", "Regulators set a new fair value", "Volume always doubles"], correct: 1, why: "Expectations drive orders. The surprise relative to expectations is what reprices an asset." },
    ],
  },
  {
    slug: "cost-of-trading",
    title: "The Cost of Trading",
    subtitle: "Brokerage, taxes and slippage — the silent compounders.",
    description: "Every order has friction. Learn to calculate the true cost of a trade before you click buy.",
    level: "Foundation", minutes: 7, reward: 50, cost: 0, seconds: 420, free: 0,
    content: `A trade has four prices: the one you see, the one you get, the one you pay in fees, and the one you keep after tax. Beginners only look at the first.\n\nOn MockTrade Matrix every order carries **brokerage** (a percentage of notional), **slippage** (execution drift), and **capital gains tax** on realised profits. A strategy that earns 0.4% per trade can be net-negative once 0.25% brokerage and 0.15% slippage are applied. Frequency is not free.\n\nTax applies to **realised** gains, not paper ones. Selling a winner creates a liability; holding does not. This is why tax-aware investors think about *when* to sell, not only *what* to sell.\n\n**The rule of thumb:** if your edge is smaller than your friction, you do not have an edge. You have a donation to the exchange.`,
    quiz: [
      { q: "Which cost applies even when a trade is profitable?", options: ["Only capital gains tax", "Brokerage and slippage, plus tax on the realised gain", "Nothing — profit covers everything", "Only the exchange's listing fee"], correct: 1, why: "Brokerage and slippage hit every fill; tax applies on top of realised gains." },
      { q: "You buy at ₹100 and sell at ₹100.40. With 0.25% brokerage and 0.15% slippage per side, you most likely…", options: ["Made a small profit", "Broke even", "Lost money after friction", "Earned exactly ₹0.40 per share"], correct: 2, why: "Friction per side (0.40%) exceeds the 0.40% gross move once applied on both legs." },
      { q: "Capital gains tax is charged on…", options: ["Unrealised paper gains", "Realised profits when you sell", "Every buy order", "Your total portfolio value"], correct: 1, why: "Tax events occur on realisation. Holding an appreciated asset does not trigger tax." },
    ],
  },
  {
    slug: "reading-balance-sheet",
    title: "Reading a Balance Sheet",
    subtitle: "Assets, liabilities and the story between the lines.",
    description: "A practical first pass at the three financial statements and the ratios that matter.",
    level: "Intermediate", minutes: 9, reward: 55, cost: 60, seconds: 540, free: 0,
    content: `A balance sheet is a photograph: what a company owns, what it owes, and what is left for shareholders. The income statement is a video: what it earned over a period. The cash flow statement is the lie detector.\n\nStart with three questions:\n\n• **Can it pay its bills?** Compare current assets to current liabilities. A current ratio below 1 deserves an explanation.\n• **Is growth funded by profit or by debt?** Rising revenue with rising borrowings is a different company than rising revenue with rising cash.\n• **Does profit turn into cash?** If net income grows but operating cash flow does not, investigate receivables and inventory.\n\nRatios are comparisons, not verdicts. A 30× P/E is expensive only relative to growth, risk and the alternatives. A 5× P/E can be a bargain or a warning that the earnings are about to disappear.\n\nRead the footnotes. That is where leases, contingencies and related-party transactions live — and where the most useful questions are hiding.`,
    quiz: [
      { q: "Which statement is the best check on reported profit?", options: ["The balance sheet", "The cash flow statement", "The CEO's letter", "The share price chart"], correct: 1, why: "Operating cash flow reveals whether accounting profit is converting into real cash." },
      { q: "A current ratio below 1 suggests…", options: ["The company has more current liabilities than current assets", "The company is definitely bankrupt", "The stock is undervalued", "The company pays no tax"], correct: 0, why: "It means short-term obligations exceed short-term resources — a liquidity question to investigate." },
      { q: "A low P/E ratio always means…", options: ["The stock is cheap", "Nothing on its own — it must be compared with growth, risk and peers", "The company is growing fast", "Dividends are guaranteed"], correct: 1, why: "Valuation multiples are relative. Low P/E can signal value or collapsing earnings." },
    ],
  },
  {
    slug: "diversification-etfs",
    title: "Diversification & ETFs",
    subtitle: "Own the basket, not just the story.",
    description: "How correlation, concentration and expense ratios decide whether your portfolio survives a bad year.",
    level: "Intermediate", minutes: 8, reward: 55, cost: 70, seconds: 480, free: 0,
    content: `Diversification is the only free lunch in finance — but only if the assets are actually different. Ten tech stocks are one bet with ten tickers. A portfolio of banks, gold, bonds and global equities is several bets that can fail at different times.\n\n**Correlation** measures how assets move together. Adding an asset that always moves with your existing holdings increases complexity without reducing risk. The goal is a mix whose bad days do not all happen on the same day.\n\nAn **ETF** is a basket that trades like a single stock. It gives you instant diversification, transparent holdings and usually a low expense ratio. But an ETF is only as diversified as its index: a market-cap-weighted index can become dangerously concentrated in a handful of mega-caps.\n\nCheck three things before buying any fund or ETF: what it holds, what it costs, and what it tracks. A 1.5% annual fee sounds small until you realise it compounds against you for decades.`,
    quiz: [
      { q: "Owning ten technology stocks is…", options: ["Strong diversification", "One concentrated sector bet with ten tickers", "A hedge against a tech selloff", "Identical to owning an index fund"], correct: 1, why: "Diversification requires exposure to different drivers, not more names in the same driver." },
      { q: "What does correlation describe?", options: ["A fund's total return", "How closely two assets move together", "The fee an ETF charges", "The number of holdings in a basket"], correct: 1, why: "Correlation measures co-movement; low correlation is what makes diversification work." },
      { q: "The most important ETF costs to check are…", options: ["Only the brokerage fee", "Expense ratio, tracking difference and trading spread", "The fund's logo and marketing", "The number of shares outstanding"], correct: 1, why: "Ongoing expense ratio, tracking quality and spread determine the real cost of ownership." },
    ],
  },
  {
    slug: "insurance-protection",
    title: "Insurance & Protection",
    subtitle: "Premiums, deductibles and what you are really buying.",
    description: "Insurance is not an investment. It is a transfer of a risk you cannot afford to carry alone.",
    level: "Intermediate", minutes: 6, reward: 50, cost: 70, seconds: 360, free: 0,
    content: `Insurance exists to protect against losses so large they would damage your life. It is not designed to make you rich. When a policy is sold as an investment, check what is being bundled — and what it costs.\n\nThree numbers define any policy:\n\n• **Premium** — what you pay to transfer the risk.\n• **Deductible** — what you pay before cover begins.\n• **Cover limit** — the maximum the insurer will pay.\n\nA low premium with a huge deductible is not cheap; it is a bet that nothing small goes wrong. A high premium with a low limit is often the worst of both worlds.\n\nTerm life is the cleanest example: pure protection, no cash-value illusion. Health cover protects the largest unpredictable expense a household faces. The right question is not "what will this pay me back?" but "which catastrophic loss am I no longer able to carry?"`,
    quiz: [
      { q: "The main purpose of insurance is to…", options: ["Generate investment returns", "Transfer a catastrophic risk you cannot self-fund", "Avoid paying taxes", "Beat inflation"], correct: 1, why: "Insurance is risk transfer, not a return engine." },
      { q: "A higher deductible usually means…", options: ["A higher premium", "A lower premium but more out-of-pocket before cover", "More coverage with no trade-off", "The policy is fraudulent"], correct: 1, why: "You accept more of the small losses in exchange for a lower premium." },
      { q: "Term life insurance is considered 'pure protection' because…", options: ["It has a large cash-value component", "It pays only on death and has no investment wrapper", "It is free", "It covers health expenses"], correct: 1, why: "Term cover is protection only, with no bundled savings or cash value." },
    ],
  },
  {
    slug: "crypto-carefully",
    title: "Crypto, Carefully",
    subtitle: "Volatility, custody and the cost of being early.",
    description: "Treat digital assets as an isolated, high-volatility sandbox — not a savings account.",
    level: "Advanced", minutes: 7, reward: 60, cost: 80, seconds: 420, free: 0,
    content: `Crypto assets trade 24/7, have no earnings, and can move 20% on a headline. That does not make them worthless — it makes them a different risk category that must be sized accordingly.\n\nOn this platform crypto lives in an **isolated sandbox**. It cannot quietly consume your education portfolio. That mirrors a real principle: speculative capital should be capped and separated from money you need.\n\nThree risks to name out loud:\n\n• **Volatility risk** — a 50% drawdown is normal, not exceptional.\n• **Custody risk** — who holds the keys, and what happens if they lose them?\n• **Liquidity and fee risk** — spreads widen exactly when you most want to sell.\n\nA sane allocation is one where a total loss changes your life by zero. If a position keeps you awake, it is too large — regardless of how compelling the story is.`,
    quiz: [
      { q: "Why is the crypto sandbox isolated from the main portfolio?", options: ["To increase leverage", "To cap speculative risk so it cannot damage core savings", "Because crypto cannot be priced", "To avoid all taxes"], correct: 1, why: "Isolation enforces position sizing: speculative capital is capped by design." },
      { q: "A 50% crypto drawdown should be treated as…", options: ["Impossible", "A normal risk of the asset class", "Proof of fraud", "A buying guarantee"], correct: 1, why: "Extreme drawdowns are a known, recurring feature of crypto volatility." },
      { q: "The right size for a speculative position is one where…", options: ["You use maximum available capital", "A total loss changes your life by zero", "You borrow to increase it", "It exceeds your emergency fund"], correct: 1, why: "Position sizing is defined by tolerable loss, not conviction." },
    ],
  },
  {
    slug: "algorithmic-thinking",
    title: "Algorithmic Thinking",
    subtitle: "Turn a hunch into testable IF/ELSE logic.",
    description: "Conditions, execution and backtesting — the bridge between programming and markets.",
    level: "Advanced", minutes: 10, reward: 65, cost: 100, seconds: 600, free: 0,
    content: `An algorithm is a decision rule written so precisely that a machine can execute it without interpretation. "Buy when it looks strong" is not a rule. "Buy 10 shares when the 20-day average crosses above the 50-day average and sentiment is positive" is.\n\nEvery strategy needs four parts:\n\n• **Universe** — what you are allowed to trade.\n• **Signal** — the IF condition that must be true.\n• **Sizing** — how much capital each signal receives.\n• **Exit** — the condition that closes the position, including a stop.\n\n**Backtesting** replays a rule against history. It is a sanity check, not a promise. Watch for overfitting: if you tune a rule until it perfectly explains the past, it will usually fail in the future. Prefer simple rules with a plausible economic reason.\n\nOn MockTrade Matrix the Rule Builder executes IF/ELSE logic against live simulated prices. Start with one condition, one instrument and a hard position limit. Complexity is not an edge. Discipline is.`,
    quiz: [
      { q: "Which is a properly specified trading rule?", options: ["Buy when the stock looks strong", "Buy 10 shares if 20-day SMA > 50-day SMA and RSI < 70", "Buy because a friend did", "Buy at a good price"], correct: 1, why: "It names quantity, instrument context and machine-checkable conditions." },
      { q: "Backtesting is best described as…", options: ["A guarantee of future returns", "A sanity check against history that can overfit", "A way to avoid fees", "A regulatory requirement"], correct: 1, why: "Backtests validate plausibility, but overfitting is a serious risk." },
      { q: "What does overfitting mean?", options: ["Tuning a rule until it fits the past but fails forward", "Trading too many shares", "Using too few indicators", "Holding a position too long"], correct: 0, why: "Overfitted rules memorise noise instead of capturing a durable edge." },
    ],
  },
];

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* Bump this whenever the seeded content or demo data changes. It gates the
   one-time cleanup of demo accounts created by earlier builds. */
const DATA_VERSION = "4";

export const ADMIN_EMAIL = "admin@mocktrade.app";
export const ADMIN_PASSWORD = "admin@123";

function seed(d: DatabaseSync) {
  // Fast path: once the database is populated there is nothing to write.
  // Build workers import this module concurrently, so avoid taking a write
  // lock on every import — that is what caused "database is locked" during
  // `next build` page-data collection.
  const counts = d
    .prepare(
      `SELECT (SELECT COUNT(*) FROM users) AS u,
              (SELECT COUNT(*) FROM assets) AS a,
              (SELECT COUNT(*) FROM modules) AS m`
    )
    .get() as { u: number; a: number; m: number };
  const admin = d
    .prepare("SELECT role FROM users WHERE lower(email) = lower(?)")
    .get(ADMIN_EMAIL) as { role: string } | undefined;
  const version = d
    .prepare("SELECT value FROM meta WHERE key = 'data_version'")
    .get() as { value: string } | undefined;
  if (
    Number(counts.u) > 0 && Number(counts.a) > 0 && Number(counts.m) > 0 &&
    admin?.role === "admin" && version?.value === DATA_VERSION
  ) {
    return;
  }

  // One writer at a time: build workers can import this module concurrently.
  d.exec("BEGIN IMMEDIATE");
  try {
    const assetCount = Number((d.prepare("SELECT COUNT(*) AS c FROM assets").get() as any).c);
    if (assetCount === 0) seedAssets(d);
    const moduleCount = Number((d.prepare("SELECT COUNT(*) AS c FROM modules").get() as any).c);
    if (moduleCount === 0) seedModules(d);
    ensureAdmin(d);
    if (version?.value !== DATA_VERSION) {
      purgeDemoData(d);
      // Earlier builds marked accounts verified with a simulated scan. Those
      // flags cannot stand: only an approved OCR document keeps access.
      d.prepare(
        `UPDATE users SET id_verified = 0, verified_name = NULL, verified_address = NULL
         WHERE role <> 'admin' AND id_verified = 1
           AND NOT EXISTS (
             SELECT 1 FROM id_documents d WHERE d.user_id = users.id AND d.status = 'approved'
           )`
      ).run();
      d.prepare(
        "INSERT INTO meta (key,value) VALUES ('data_version',?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      ).run(DATA_VERSION);
    }
    d.exec("COMMIT");
  } catch (err) {
    d.exec("ROLLBACK");
    throw err;
  }
}

function ensureAdmin(d: DatabaseSync) {
  const existing = d.prepare("SELECT id, role, password_hash FROM users WHERE lower(email) = lower(?)").get(ADMIN_EMAIL) as
    | { id: number; role: string; password_hash: string }
    | undefined;
  if (existing) {
    if (existing.role !== "admin") d.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
    if (!bcrypt.compareSync(ADMIN_PASSWORD, existing.password_hash)) {
      d.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(ADMIN_PASSWORD, 10), existing.id);
    }
    return;
  }

  const ts = now();
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  const res = d.prepare(`INSERT INTO users
    (email,password_hash,name,role,mode,region,avatar,credits,cash,crypto_cash,start_capital,xp,streak,
     id_verified,guardian_status,guardian_email,terms_accepted,crash_done,accent,dob,created_at,last_seen)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    ADMIN_EMAIL, hash, "Matrix Admin", "admin", "programmer", "IN", "MX", 999, 100000, 15000, 100000,
    6000, 42, 1, "not_required", null, 1, 1, "violet", "1992-03-14", ts, ts
  );
  const uid = Number(res.lastInsertRowid);
  const modules = d.prepare("SELECT id FROM modules WHERE is_published = 1 ORDER BY order_index").all() as Array<{ id: number }>;
  const progress = d.prepare("INSERT INTO module_progress (user_id,module_id,status,score,completed_at) VALUES (?,?,?,?,?)");
  for (const m of modules) progress.run(uid, m.id, "unlocked", 0, null);
  d.prepare("INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)").run(
    uid, "success", "Admin access enabled", "You can publish video lessons and quizzes from the admin console.", ts
  );
}

/* Remove the demo accounts and fabricated history that earlier builds seeded.
   Real accounts (and the admin) are never touched. */
const DEMO_EMAILS = [
  "demo@mocktrade.app",
  "priya@mocktrade.app",
  "rohan@mocktrade.app",
  "maya@mocktrade.app",
  "dev@mocktrade.app",
  "sofia@mocktrade.app",
];

function purgeDemoData(d: DatabaseSync) {
  const placeholders = DEMO_EMAILS.map(() => "?").join(",");
  const rows = d
    .prepare(`SELECT id FROM users WHERE lower(email) IN (${placeholders})`)
    .all(...DEMO_EMAILS) as Array<{ id: number }>;

  const owned = [
    "holdings", "orders", "transactions", "module_progress", "quiz_attempts",
    "guardian_requests", "rules", "notifications", "activity", "crash_events",
    "classroom_members", "messages",
  ];
  for (const { id } of rows) {
    for (const table of owned) d.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(id);
    d.prepare("DELETE FROM friends WHERE requester = ? OR addressee = ?").run(id, id);
    d.prepare("DELETE FROM direct_messages WHERE sender_id = ? OR recipient_id = ?").run(id, id);
    d.prepare("DELETE FROM challenges WHERE host_id = ? OR guest_id = ?").run(id, id);
    d.prepare("DELETE FROM classrooms WHERE owner_id = ?").run(id);
    d.prepare("DELETE FROM users WHERE id = ?").run(id);
  }

  // Fabricated forecast history from the old seeder (the live engine resolves
  // after 90s, the seeder used 45s).
  d.prepare("DELETE FROM predictions WHERE resolved_at IS NOT NULL AND resolve_at - created_at = 45000").run();

  // Crash drills used to fire every few minutes, which left a wall of
  // fabricated "crash" history and marked everybody as already trained.
  d.prepare("DELETE FROM activity WHERE type = 'crash'").run();
  d.prepare("DELETE FROM crash_events").run();
  d.prepare("UPDATE users SET crash_done = 0 WHERE role = 'user'").run();
}

function seedAssets(d: DatabaseSync) {
  const ts = now();
  const insertAsset = d.prepare(`INSERT INTO assets
    (symbol,name,class,region,sector,currency,price,prev_close,day_open,base_price,volatility,sentiment,headline,esg,about,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertCandle = d.prepare(`INSERT INTO candles (symbol,t,o,h,l,c) VALUES (?,?,?,?,?,?)`);
  const todaySec = Math.floor(ts / 1000 / 86400) * 86400;

  for (const [symbol, name, cls, region, sector, price, vol, esg, about] of ASSETS) {
    const rand = mulberry32(hash(symbol));
    const days = 220;
    const points: Array<{ t: number; o: number; h: number; l: number; c: number }> = [];
    let p = price * (0.62 + rand() * 0.35);
    let prev = p;
    for (let i = 0; i < days; i++) {
      const drift = 0.0009 + (rand() - 0.48) * 0.002;
      p = Math.max(0.01, p * (1 + drift + (rand() - 0.5) * vol * 3.2));
      const o = prev;
      const c = p;
      const h = Math.max(o, c) * (1 + rand() * vol * 0.9);
      const l = Math.min(o, c) * (1 - rand() * vol * 0.9);
      points.push({ t: todaySec - (days - 1 - i) * 86400, o, h, l, c });
      prev = c;
    }
    // scale so the final close is exactly the configured price
    const scale = price / points[points.length - 1].c;
    for (const pt of points) {
      insertCandle.run(symbol, pt.t, pt.o * scale, pt.h * scale, pt.l * scale, pt.c * scale);
    }
    const last = points[points.length - 1];
    const prevClose = points[points.length - 2].c * scale;
    insertAsset.run(
      symbol, name, cls, region, sector, "USD",
      price, prevClose, last.o * scale, price, vol,
      0, "Market opens with a neutral tape.", esg, about, ts
    );
  }
}

function seedModules(d: DatabaseSync) {
  const insertModule = d.prepare(`INSERT INTO modules
    (slug,title,subtitle,description,level,order_index,minutes,reward_credits,unlock_cost,video_seconds,content,is_free)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertQ = d.prepare(`INSERT INTO quiz_questions (module_id,prompt,options,correct,explanation) VALUES (?,?,?,?,?)`);
  MODULES.forEach((m, i) => {
    const r = insertModule.run(
      m.slug, m.title, m.subtitle, m.description, m.level, i + 1,
      m.minutes, m.reward, m.cost, m.seconds, m.content, m.free
    );
    const moduleId = Number(r.lastInsertRowid);
    for (const q of m.quiz) {
      insertQ.run(moduleId, q.q, JSON.stringify(q.options), q.correct, q.why);
    }
  });
  d.prepare("UPDATE modules SET video_url = ? WHERE slug = ?").run(
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "money-markets-risk"
  );
}


/* ------------------------------------------------------------------ */
/* connection                                                          */
/* ------------------------------------------------------------------ */

function create(): DatabaseSync {
  // During `next build` several workers import this module at once. Give each
  // worker its own in-memory copy of the seeded schema so page-data collection
  // never races on the production database file.
  const building = process.env.NEXT_PHASE === "phase-production-build";
  let d: DatabaseSync;
  if (building) {
    d = new DatabaseSync(":memory:");
  } else {
    // DATA_DIR lets a host put the database somewhere other than the app folder
    // (see lib/backup.mjs for the ephemeral-disk case).
    const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    d = new DatabaseSync(path.join(dir, "mocktrade.db"));
  }
  migrate(d);
  seed(d);
  return d;
}

export const db: DatabaseSync = g.__mtm_db ?? (g.__mtm_db = create());
