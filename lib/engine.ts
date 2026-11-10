import "server-only";
import { all, one, run, now, tx, DAY, type Asset } from "./db";
import { forecast, nextHeadline, sma, rsi } from "./ai";
import { getPredictionStats, getPortfolio } from "./data";
import { executeOrder, portfolioValueLocal, creditsForUser, notify } from "./trading";
import { emit, emitToUser, emitToRoom, getIO } from "./realtime";
import { sweepQuests } from "./quests";

type Point = { t: number; p: number };
type CrashPhase = "calm" | "warning" | "recovery";

type EngineState = {
  started: boolean;
  assets: Map<string, Asset>;
  closes: Map<string, number[]>;
  intraday: Map<string, Point[]>;
  online: Map<number, number>;
  queue: Map<number, { socketId: string; name: string; avatar: string; region: string }>;
  bots: Map<number, number>;
  crash: { phase: CrashPhase; next: number; endsAt: number; warned: boolean };
  ticks: number;
};

const g = globalThis as any;

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
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function getState(): EngineState {
  if (!g.__mtm_engine) {
    g.__mtm_engine = {
      started: false,
      assets: new Map(),
      closes: new Map(),
      intraday: new Map(),
      online: new Map(),
      queue: new Map(),
      bots: new Map(),
      crash: { phase: "calm", next: 0, endsAt: 0, warned: false },
      ticks: 0,
    } as EngineState;
  }
  return g.__mtm_engine;
}

function loadState() {
  const state = getState();
  const assets = all<Asset>("SELECT * FROM assets");
  for (const a of assets) {
    state.assets.set(a.symbol, a);
    if (!state.closes.has(a.symbol)) {
      const rows = all<{ c: number }>(
        "SELECT c FROM candles WHERE symbol = ? ORDER BY t DESC LIMIT 60",
        a.symbol
      );
      state.closes.set(a.symbol, rows.map((r) => r.c).reverse());
    }
    if (!state.intraday.has(a.symbol)) {
      const rand = mulberry32(hash(a.symbol + "intraday"));
      const pts: Point[] = [];
      let p = a.price * (0.985 + rand() * 0.02);
      const start = now() - 3 * 60 * 60_000;
      for (let i = 0; i < 90; i++) {
        p = Math.max(0.01, p * (1 + (rand() - 0.49) * a.volatility * 0.45));
        pts.push({ t: start + i * 120_000, p });
      }
      pts.push({ t: now(), p: a.price });
      state.intraday.set(a.symbol, pts);
    }
  }
}

export function getIntraday(symbol: string): Point[] {
  const state = getState();
  const live = state.intraday.get(symbol);
  if (live && live.length > 1) return live;
  const a = one<Asset>("SELECT * FROM assets WHERE symbol = ?", symbol);
  if (!a) return [];
  const rand = mulberry32(hash(symbol + "fallback"));
  const pts: Point[] = [];
  let p = a.price * 0.99;
  const start = now() - 3 * 60 * 60_000;
  for (let i = 0; i < 90; i++) {
    p = Math.max(0.01, p * (1 + (rand() - 0.49) * a.volatility * 0.45));
    pts.push({ t: start + i * 120_000, p });
  }
  pts.push({ t: now(), p: a.price });
  return pts;
}

export function getCrashState() {
  const state = getState();
  return {
    phase: state.crash.phase,
    nextAt: state.crash.next,
    endsAt: state.crash.endsAt,
    active: state.crash.phase === "recovery",
  };
}

/* ------------------------------------------------------------------ */
/* market loop                                                         */
/* ------------------------------------------------------------------ */

function tick() {
  const state = getState();
  const io = getIO();
  const t = now();
  state.ticks++;
  const recovery = state.crash.phase === "recovery";
  const updates: Array<{ s: string; p: number; pc: number; c: string; chg: number; sent: number }> = [];

  tx(() => {
    for (const a of state.assets.values()) {
      const rand = Math.random();
      const vol = a.volatility * (recovery ? 0.9 : 0.18);
      const revert = ((a.base_price - a.price) / a.base_price) * (recovery ? 0.05 : 0.0025);
      const drift = recovery ? 0.0034 : a.sentiment * 0.00012;
      let shock = gauss() * vol + revert + drift;
      if (rand < 0.004) shock += (Math.random() < 0.5 ? 1 : -1) * (0.004 + Math.random() * 0.014);
      a.price = Math.max(0.005, a.price * (1 + shock));
      a.updated_at = t;
      run("UPDATE assets SET price = ?, updated_at = ? WHERE symbol = ?", a.price, t, a.symbol);

      const closes = state.closes.get(a.symbol)!;
      closes.push(a.price);
      if (closes.length > 90) closes.shift();

      const pts = state.intraday.get(a.symbol)!;
      pts.push({ t, p: a.price });
      if (pts.length > 260) pts.shift();

      updates.push({
        s: a.symbol, p: a.price, pc: a.prev_close, c: a.class,
        chg: ((a.price - a.prev_close) / a.prev_close) * 100, sent: a.sentiment,
      });
    }
  });

  io?.emit("market:tick", { t, assets: updates });
  maybeCrash(t);
}

/* Market crashes are rare and unpredictable in real life. Schedule them
   between two days and two weeks out, never on a fixed cadence. */
const CRASH_MIN_GAP = 2 * DAY;
const CRASH_MAX_GAP = 14 * DAY;

const CRASH_META_KEY = "crash_schedule";

function nextCrashAt(from: number) {
  return from + CRASH_MIN_GAP + Math.random() * (CRASH_MAX_GAP - CRASH_MIN_GAP);
}

/* Persist the schedule so restarts and free-tier cold starts resume the same
   drill instead of silently pushing it out by another 2-14 days. */
function saveCrashSchedule() {
  const c = getState().crash;
  try {
    run(
      "INSERT INTO meta (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      CRASH_META_KEY,
      JSON.stringify({ phase: c.phase, next: c.next, endsAt: c.endsAt, warned: c.warned })
    );
  } catch (e) {
    console.error("[engine] crash schedule persist", e);
  }
}

function restoreCrashSchedule(t: number) {
  const c = getState().crash;
  let saved: { phase?: CrashPhase; next?: number; endsAt?: number; warned?: boolean } | null = null;
  try {
    const row = one<{ value: string }>("SELECT value FROM meta WHERE key = ?", CRASH_META_KEY);
    if (row?.value) saved = JSON.parse(row.value);
  } catch (e) {
    console.error("[engine] crash schedule restore", e);
  }

  // Never fire a drill instantly after booting: give live users time to see
  // the warning. Overdue or near-due drills get a short randomized delay.
  const soon = () => t + 60_000 + Math.random() * 9 * 60_000;

  if (!saved || typeof saved.next !== "number" || !Number.isFinite(saved.next)) {
    c.phase = "calm";
    c.warned = false;
    c.endsAt = 0;
    c.next = nextCrashAt(t);
  } else if (saved.phase === "recovery") {
    // Finish an interrupted recovery so halved prices climb back to their base.
    c.phase = "recovery";
    c.warned = true;
    c.endsAt = typeof saved.endsAt === "number" && saved.endsAt > t ? saved.endsAt : t + 60_000;
    c.next = typeof saved.next === "number" && saved.next > c.endsAt ? saved.next : nextCrashAt(c.endsAt);
  } else {
    // Calm or warning: re-arm cleanly so the 20-second warning is never skipped.
    c.phase = "calm";
    c.warned = false;
    c.endsAt = 0;
    c.next = saved.next > t + 20_000 ? saved.next : soon();
  }

  saveCrashSchedule();
  return c.next;
}

function maybeCrash(t: number) {
  const state = getState();
  if (state.crash.phase === "calm" && !state.crash.next) {
    state.crash.next = nextCrashAt(t);
    saveCrashSchedule();
  }
  if (state.crash.phase === "calm" && t >= state.crash.next - 20_000 && !state.crash.warned) {
    state.crash.warned = true;
    state.crash.phase = "warning";
    saveCrashSchedule();
    emit("market:warning", { seconds: 20, at: state.crash.next });
    return;
  }
  if (state.crash.phase === "warning" && t >= state.crash.next) {
    triggerCrash(t);
    return;
  }
  if (state.crash.phase === "recovery" && t >= state.crash.endsAt) {
    state.crash.phase = "calm";
    state.crash.warned = false;
    state.crash.next = nextCrashAt(t);
    saveCrashSchedule();
    emit("market:recovered", { at: t });
  }
}

function triggerCrash(t: number) {
  const state = getState();
  state.crash.phase = "recovery";
  state.crash.endsAt = t + 6 * 60_000;
  state.crash.next = nextCrashAt(state.crash.endsAt);
  state.crash.warned = true;

  tx(() => {
    for (const a of state.assets.values()) {
      a.price = Math.max(0.005, a.price * 0.5);
      a.updated_at = t;
      run("UPDATE assets SET price = ?, updated_at = ? WHERE symbol = ?", a.price, t, a.symbol);
      const pts = state.intraday.get(a.symbol)!;
      pts.push({ t, p: a.price });
    }
    const holders = all<{ user_id: number }>(
      "SELECT DISTINCT user_id FROM holdings WHERE bucket = 'main' AND qty > 0"
    );
    for (const h of holders) {
      run("INSERT INTO crash_events (user_id,drawdown,triggered_at) VALUES (?,?,?)", h.user_id, 50, t);
      run("UPDATE users SET crash_done = 1 WHERE id = ?", h.user_id);
      notify(h.user_id, "danger", "Crash drill triggered", "A simulated 50% drawdown just hit the market. This is training, not a loss of real money.");
    }
    run("INSERT INTO activity (user_id,type,text,created_at) VALUES (?,?,?,?)",
      null, "crash", "Forced market crash drill: a simulated 50% drawdown swept the market", t);
  });
  saveCrashSchedule();

  emit("market:crash", {
    at: t, magnitude: 50, recoversAt: state.crash.endsAt,
    message: "Simulated 50% drawdown. Watch your habits, not your ego.",
  });
  emit("activity:new", {
    text: "Forced market crash drill: a simulated 50% drawdown swept the market",
    name: "MockTrade Matrix", avatar: "MT", type: "crash", created_at: t,
  });
}

/* ------------------------------------------------------------------ */
/* news + predictions                                                  */
/* ------------------------------------------------------------------ */

function newsLoop() {
  const state = getState();
  const assets = Array.from(state.assets.values());
  const picks = new Set<number>();
  while (picks.size < 4) picks.add(Math.floor(Math.random() * assets.length));
  const out: Array<{ s: string; sentiment: number; headline: string }> = [];
  tx(() => {
    for (const idx of picks) {
      const a = assets[idx];
      const { sentiment, headline } = nextHeadline(a);
      a.sentiment = sentiment;
      a.headline = headline;
      run("UPDATE assets SET sentiment = ?, headline = ? WHERE symbol = ?", sentiment, headline, a.symbol);
      out.push({ s: a.symbol, sentiment, headline });
    }
  });
  emit("market:news", { t: now(), items: out });
}

function predictionLoop() {
  const state = getState();
  const t = now();
  const due = all<{ id: number; symbol: string; direction: string; start_price: number; target_price: number }>(
    "SELECT id,symbol,direction,start_price,target_price FROM predictions WHERE resolved_at IS NULL AND resolve_at <= ?",
    t
  );
  for (const p of due) {
    const a = state.assets.get(p.symbol);
    if (!a) continue;
    const up = a.price > p.start_price;
    const correct = p.direction === "bullish" ? up : p.direction === "bearish" ? !up : Math.abs(a.price / p.start_price - 1) < 0.002;
    run("UPDATE predictions SET resolved_at = ?, end_price = ?, correct = ? WHERE id = ?", t, a.price, correct ? 1 : 0, p.id);
  }

  const assets = Array.from(state.assets.values());
  for (let i = 0; i < 5; i++) {
    const a = assets[Math.floor(Math.random() * assets.length)];
    const active = one("SELECT id FROM predictions WHERE symbol = ? AND resolved_at IS NULL", a.symbol);
    if (active) continue;
    const f = forecast(a, state.closes.get(a.symbol) ?? [a.price]);
    run(
      `INSERT INTO predictions (symbol,direction,confidence,start_price,target_price,horizon,created_at,resolve_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      a.symbol, f.direction, f.confidence, a.price, f.target, "1D", t, t + 90_000
    );
    emitToRoom("ai", "ai:update", {
      symbol: a.symbol, direction: f.direction, confidence: f.confidence,
      target: f.target, drivers: f.drivers, rsi: f.rsi, momentum: f.momentum,
    });
  }

  if (due.length) {
    emit("ai:resolved", { count: due.length, accuracy: getPredictionStats().accuracy });
  }
}

/* ------------------------------------------------------------------ */
/* rules                                                               */
/* ------------------------------------------------------------------ */

type Cond = { field: string; op: string; value: number };
type CondGroup = { logic: string; conditions: Cond[] };

function compare(value: number, op: string, target: number) {
  switch (op) {
    case ">": return value > target;
    case ">=": return value >= target;
    case "<": return value < target;
    case "<=": return value <= target;
    case "==": return Math.abs(value - target) < 0.0001;
    default: return false;
  }
}

function ruleLoop() {
  const state = getState();
  const rules = all<{
    id: number; user_id: number; name: string; symbol: string; conditions: string;
    action: string; last_triggered: number | null;
  }>("SELECT * FROM rules WHERE active = 1");
  const t = now();

  for (const r of rules) {
    if (r.last_triggered && t - r.last_triggered < 45_000) continue;
    const a = state.assets.get(r.symbol);
    if (!a) continue;
    let group: CondGroup;
    let action: { side: "BUY" | "SELL"; qty: number };
    try {
      group = JSON.parse(r.conditions);
      action = JSON.parse(r.action);
    } catch { continue; }

    const closes = state.closes.get(a.symbol) ?? [a.price];
    const values: Record<string, number> = {
      price: a.price,
      change_pct: ((a.price - a.prev_close) / a.prev_close) * 100,
      rsi: 0,
      sentiment: a.sentiment,
      momentum: (a.price / (sma(closes, 20) || a.price) - 1) * 100,
    };
    values.rsi = rsi(closes);

    const results = group.conditions.map((c) => compare(values[c.field] ?? 0, c.op, c.value));
    const passed = group.logic === "OR" ? results.some(Boolean) : results.every(Boolean);
    if (!passed) continue;

    const res = executeOrder({ userId: r.user_id, symbol: r.symbol, side: action.side, qty: action.qty, source: `rule:${r.id}` });
    run("UPDATE rules SET last_triggered = ?, trigger_count = trigger_count + 1 WHERE id = ?", t, r.id);
    if (res.ok) {
      notify(r.user_id, "success", `Rule executed · ${r.name}`, `${action.side} ${action.qty} ${r.symbol} triggered by your IF/ELSE logic.`);
      emitToUser(r.user_id, "rule:triggered", { id: r.id, name: r.name, symbol: r.symbol, side: action.side, qty: action.qty, at: t });
    } else {
      notify(r.user_id, "warning", `Rule blocked · ${r.name}`, res.error);
    }
  }
}

/* ------------------------------------------------------------------ */
/* challenges                                                          */
/* ------------------------------------------------------------------ */

function challengeLoop() {
  const state = getState();
  const t = now();
  const active = all<{
    id: number; host_id: number; guest_id: number | null; guest_name: string | null;
    is_bot: number; start_at: number; end_at: number; host_start: number; guest_start: number;
  }>("SELECT * FROM challenges WHERE status = 'active'");

  for (const c of active) {
    const hostValue = portfolioValueLocal(c.host_id);
    let guestValue: number;
    if (c.is_bot) {
      const current = state.bots.get(c.id) ?? c.guest_start;
      const next = current * (1 + (Math.random() - 0.475) * 0.004);
      state.bots.set(c.id, next);
      guestValue = next;
    } else if (c.guest_id) {
      guestValue = portfolioValueLocal(c.guest_id);
    } else {
      guestValue = c.guest_start;
    }

    run("UPDATE challenges SET host_value = ?, guest_value = ? WHERE id = ?", hostValue, guestValue, c.id);
    const payload = {
      id: c.id,
      hostValue, guestValue,
      hostReturn: ((hostValue - c.host_start) / c.host_start) * 100,
      guestReturn: ((guestValue - c.guest_start) / c.guest_start) * 100,
      endsAt: c.end_at,
    };
    emitToRoom(`challenge:${c.id}`, "challenge:tick", payload);

    if (t >= c.end_at) {
      const hostReturn = (hostValue - c.host_start) / c.host_start;
      const guestReturn = (guestValue - c.guest_start) / c.guest_start;
      const winnerId = hostReturn >= guestReturn ? c.host_id : c.guest_id;
      run("UPDATE challenges SET status = 'finished', winner_id = ? WHERE id = ?", winnerId, c.id);
      const hostWon = winnerId === c.host_id;
      creditsForUser(c.host_id, hostWon ? 25 : 10, hostWon ? "Challenge win · portfolio sprint" : "Challenge completed · runner-up");
      if (c.guest_id) {
        creditsForUser(c.guest_id, hostWon ? 10 : 25, hostWon ? "Challenge completed · runner-up" : "Challenge win · portfolio sprint");
        notify(c.guest_id, "social", hostWon ? "Challenge finished" : "You won the sprint!", hostWon ? "Your opponent edged you out. Rematch?" : "You beat your opponent on return. +25 credits.");
      }
      notify(c.host_id, "social", hostWon ? "You won the sprint!" : "Challenge finished", hostWon ? "You beat your opponent on return. +25 credits." : "Your opponent edged you out. Rematch?");
      emitToRoom(`challenge:${c.id}`, "challenge:end", {
        id: c.id, winnerId, hostWon,
        hostValue, guestValue,
        hostReturn: hostReturn * 100, guestReturn: guestReturn * 100,
      });
      state.bots.delete(c.id);
    }
  }
}

/* ------------------------------------------------------------------ */
/* socket handlers                                                     */
/* ------------------------------------------------------------------ */

function snapshot() {
  const state = getState();
  return {
    t: now(),
    assets: Array.from(state.assets.values()).map((a) => ({
      s: a.symbol, p: a.price, pc: a.prev_close, c: a.class,
      chg: ((a.price - a.prev_close) / a.prev_close) * 100, sent: a.sentiment,
    })),
    crash: getCrashState(),
    accuracy: getPredictionStats().accuracy,
  };
}

function registerSocket(io: any) {
  io.on("connection", (socket: any) => {
    const userId = Number(socket.data.userId);
    if (!userId) return;
    const state = getState();
    socket.join(`user:${userId}`);
    socket.join("ai");
    const count = (state.online.get(userId) ?? 0) + 1;
    state.online.set(userId, count);
    run("UPDATE users SET last_seen = ? WHERE id = ?", now(), userId);
    emit("presence", { online: state.online.size });

    socket.emit("market:state", snapshot());
    const user = one<{ name: string; avatar: string; region: string }>(
      "SELECT name, avatar, region FROM users WHERE id = ?", userId
    );
    if (user) socket.emit("me", { id: userId, ...user });

    socket.on("matchmaking:join", () => {
      if (state.queue.has(userId)) return;
      const user = one<{ name: string; avatar: string; region: string }>(
        "SELECT name, avatar, region FROM users WHERE id = ?", userId
      );
      if (!user) return;
      let opponent: [number, { socketId: string; name: string; avatar: string; region: string }] | null = null;
      for (const [uid, q] of state.queue.entries()) {
        if (uid !== userId && q.region === user.region) { opponent = [uid, q]; break; }
      }
      if (opponent) {
        state.queue.delete(opponent[0]);
        const startAt = now();
        const endAt = startAt + 90_000;
        const hostStart = portfolioValueLocal(opponent[0]);
        const guestStart = portfolioValueLocal(userId);
        const r = run(
          `INSERT INTO challenges (host_id,guest_id,guest_name,is_bot,status,start_at,end_at,host_start,guest_start,host_value,guest_value,created_at)
           VALUES (?,?,?,0,'active',?,?,?,?,?,?,?)`,
          opponent[0], userId, user.name, startAt, endAt, hostStart, guestStart, hostStart, guestStart, startAt
        );
        const payload = (opp: any) => ({
          id: r.lastId, startAt, endAt, opponent: opp,
          hostStart, guestStart,
        });
        io.to(`user:${opponent[0]}`).emit("match:found", payload({ id: userId, name: user.name, avatar: user.avatar }));
        io.to(`user:${userId}`).emit("match:found", payload({ id: opponent[0], name: opponent[1].name, avatar: opponent[1].avatar }));
        emit("matchmaking:queue", { waiting: state.queue.size });
        return;
      }
      state.queue.set(userId, { socketId: socket.id, name: user.name, avatar: user.avatar, region: user.region });
      emit("matchmaking:queue", { waiting: state.queue.size });
      socket.emit("matchmaking:waiting", { position: state.queue.size });
      setTimeout(() => {
        if (!state.queue.has(userId)) return;
        state.queue.delete(userId);
        const startAt = now();
        const endAt = startAt + 90_000;
        const hostStart = portfolioValueLocal(userId);
        const botNames = ["Nova (AI trader)", "Atlas (AI trader)", "Kestrel (AI trader)", "Vector (AI trader)"];
        const bot = botNames[Math.floor(Math.random() * botNames.length)];
        const r = run(
          `INSERT INTO challenges (host_id,guest_id,guest_name,is_bot,status,start_at,end_at,host_start,guest_start,host_value,guest_value,created_at)
           VALUES (?,NULL,?,1,'active',?,?,?,?,?,?,?)`,
          userId, bot, startAt, endAt, hostStart, hostStart, hostStart, hostStart, startAt
        );
        state.bots.set(r.lastId, hostStart);
        io.to(`user:${userId}`).emit("match:found", {
          id: r.lastId, startAt, endAt, bot: true,
          opponent: { id: 0, name: bot, avatar: "AI" },
          hostStart, guestStart: hostStart,
        });
        emit("matchmaking:queue", { waiting: state.queue.size });
      }, 12_000);
    });

    socket.on("matchmaking:leave", () => {
      state.queue.delete(userId);
      emit("matchmaking:queue", { waiting: state.queue.size });
    });

    socket.on("challenge:join", ({ challengeId }: { challengeId: number }) => {
      const c = one<{ host_id: number; guest_id: number | null }>("SELECT host_id, guest_id FROM challenges WHERE id = ?", challengeId);
      if (!c) return;
      if (c.host_id !== userId && c.guest_id !== userId) return;
      socket.join(`challenge:${challengeId}`);
      const msgs = all("SELECT id,name,body,created_at FROM messages WHERE challenge_id = ? ORDER BY id DESC LIMIT 40", challengeId).reverse();
      socket.emit("chat:history", { challengeId, messages: msgs });
    });

    socket.on("chat:send", ({ challengeId, body }: { challengeId: number; body: string }) => {
      if (!body || body.length > 240) return;
      const c = one<{ host_id: number; guest_id: number | null }>("SELECT host_id, guest_id FROM challenges WHERE id = ?", challengeId);
      if (!c || (c.host_id !== userId && c.guest_id !== userId)) return;
      const user = one<{ name: string }>("SELECT name FROM users WHERE id = ?", userId);
      const r = run(
        "INSERT INTO messages (challenge_id,user_id,name,body,created_at) VALUES (?,?,?,?,?)",
        challengeId, userId, user?.name ?? "Trader", body.slice(0, 240), now()
      );
      const msg = { id: r.lastId, user_id: userId, name: user?.name ?? "Trader", body: body.slice(0, 240), created_at: now() };
      emitToRoom(`challenge:${challengeId}`, "chat:message", msg);
    });

    socket.on("disconnect", () => {
      const c = (state.online.get(userId) ?? 1) - 1;
      if (c <= 0) state.online.delete(userId);
      else state.online.set(userId, c);
      state.queue.delete(userId);
      emit("presence", { online: state.online.size });
      emit("matchmaking:queue", { waiting: state.queue.size });
    });
  });
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

export function engineStatus() {
  const state = getState();
  return { started: state.started, assets: state.assets.size, online: state.online.size };
}

export function startEngine() {
  const state = getState();
  if (state.started) return { started: true, assets: state.assets.size };
  state.started = true;
  loadState();
  const io = getIO();
  if (io) registerSocket(io);

  setInterval(() => {
    try { tick(); } catch (e) { console.error("[engine] tick", e); }
  }, 1500);
  setInterval(() => { try { newsLoop(); } catch (e) { console.error("[engine] news", e); } }, 22_000);
  setInterval(() => { try { predictionLoop(); } catch (e) { console.error("[engine] ai", e); } }, 45_000);
  setInterval(() => { try { ruleLoop(); } catch (e) { console.error("[engine] rules", e); } }, 10_000);
  setInterval(() => { try { challengeLoop(); } catch (e) { console.error("[engine] challenges", e); } }, 2000);
  setInterval(() => { try { sweepQuests(); } catch (e) { console.error("[engine] quests", e); } }, 15_000);

  restoreCrashSchedule(now());
  console.log(`[engine] started with ${state.assets.size} instruments`);
  return { started: true, assets: state.assets.size };
}
