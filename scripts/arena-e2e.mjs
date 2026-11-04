/**
 * End-to-end check for the live quiz arena.
 * Creates two throwaway learner accounts in different world regions, runs a
 * real globally-matched battle, exercises powerups, verifies persistence,
 * skill ratings and region-wise leaderboards, then removes every row it
 * created. Safe to run against a live local server.
 */
import { DatabaseSync } from "node:sqlite";
import { io } from "socket.io-client";
import bcrypt from "bcryptjs";

const BASE = "http://127.0.0.1:3000";
const DB = "data/mocktrade.db";
const stamp = Date.now();
const USERS = [
  { email: `arena-test-a-${stamp}@example.com`, name: "Arena Tester A", credits: 100, region: "IN", arenaRegion: "IN" },
  { email: `arena-test-b-${stamp}@example.com`, name: "Arena Tester B", credits: 100, region: "US", arenaRegion: "US" },
];

const db = new DatabaseSync(DB);
db.exec("PRAGMA busy_timeout = 20000;");

const ids = [];
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function insertUser(u) {
  const hash = bcrypt.hashSync("ArenaTest!23", 10);
  const ts = Date.now();
  const start = u.region === "US" ? 10000 : 100000;
  const out = db
    .prepare(
      `INSERT INTO users (email,password_hash,name,role,mode,region,arena_region,avatar,credits,cash,crypto_cash,
        start_capital,xp,streak,id_verified,verified_name,verified_address,guardian_status,
        terms_accepted,crash_done,accent,created_at,last_seen)
       VALUES (?,?,?, 'user','student',?,?, 'AT',?,?,0,?,0,1,1,?,?,'approved',1,1,'emerald',?,?)`
    )
    .run(
      u.email, hash, u.name, u.region, u.arenaRegion, u.credits, start, start,
      u.name, "Test address, Chennai, India", ts, ts
    );
  return Number(out.lastInsertRowid);
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`login ${email}: ${body.error || res.status}`);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  return { cookie, body };
}

function connect(cookie) {
  return io(BASE, {
    path: "/api/socket",
    transports: ["websocket"],
    extraHeaders: { Cookie: cookie },
    reconnection: false,
    timeout: 8000,
  });
}

function waitFor(socket, event, predicate = () => true, ms = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timeout waiting for ${event}`));
    }, ms);
    function handler(payload) {
      let pass = true;
      try {
        pass = predicate(payload);
      } catch {
        pass = false;
      }
      if (!pass) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    }
    socket.on(event, handler);
  });
}

/** Buffers every instance of an event so listeners cannot miss a fast server. */
function collector(socket, event) {
  const seen = [];
  const waiters = [];
  socket.on(event, (payload) => {
    const idx = waiters.findIndex((w) => {
      try {
        return w.pred(payload);
      } catch {
        return false;
      }
    });
    if (idx >= 0) {
      const [w] = waiters.splice(idx, 1);
      w.resolve(payload);
    } else {
      seen.push(payload);
    }
  });
  return (pred = () => true, ms = 30000) =>
    new Promise((resolve, reject) => {
      const idx = seen.findIndex((p) => {
        try {
          return pred(p);
        } catch {
          return false;
        }
      });
      if (idx >= 0) return resolve(seen.splice(idx, 1)[0]);
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
      waiters.push({
        pred,
        resolve: (payload) => {
          clearTimeout(timer);
          resolve(payload);
        },
      });
    });
}

function emitAck(socket, event, payload, ms = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ack timeout ${event}`)), ms);
    socket.emit(event, payload, (ack) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

let sockA;
let sockB;

try {
  ids.push(insertUser(USERS[0]));
  ids.push(insertUser(USERS[1]));
  const [idA, idB] = ids;
  console.log(`temp users: ${idA} (IN), ${idB} (US)`);

  const la = await login(USERS[0].email, "ArenaTest!23");
  const lb = await login(USERS[1].email, "ArenaTest!23");
  const cookieA = la.cookie;
  const cookieB = lb.cookie;
  check("both temp accounts can sign in", Boolean(cookieA && cookieB));

  // pages render for an authenticated learner
  const arenaPage = await fetch(`${BASE}/arena`, { headers: { Cookie: cookieA } });
  const arenaHtml = await arenaPage.text();
  check(
    "/arena renders the live global stage",
    arenaPage.ok && arenaHtml.includes("Beat a real player") && arenaHtml.includes("Global skill matching")
  );

  const boardPage = await fetch(`${BASE}/leaderboard`, { headers: { Cookie: cookieA } });
  const boardHtml = await boardPage.text();
  check(
    "/leaderboard renders global battles and region-wise ladders",
    boardPage.ok &&
      boardHtml.includes("Global battles, regional ladders") &&
      boardHtml.includes("India quiz ladder") &&
      boardHtml.includes("Portfolio returns")
  );

  const shopPage = await fetch(`${BASE}/shop`, { headers: { Cookie: cookieA } });
  const shopHtml = await shopPage.text();
  check(
    "/shop lists quiz powerups with server-rendered stock",
    shopPage.ok && shopHtml.includes("Quiz powerups") && shopHtml.includes("Enter the arena")
  );

  // powerups: buy two different ones, check credits and inventory
  const buyFifty = await fetch(`${BASE}/api/shop/powerup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ powerupId: "fifty" }),
  }).then((r) => r.json());
  const buySkip = await fetch(`${BASE}/api/shop/powerup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ powerupId: "skip" }),
  }).then((r) => r.json());
  check(
    "powerup purchase charges credits and stocks inventory",
    buyFifty.ok && buySkip.ok && buyFifty.credits === 85 && buySkip.credits === 65 &&
      buySkip.inventory.fifty === 1 && buySkip.inventory.skip === 1,
    `credits ${buySkip.credits}, fifty ${buySkip.inventory?.fifty}, skip ${buySkip.inventory?.skip}`
  );

  const poor = await fetch(`${BASE}/api/shop/powerup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieB },
    body: JSON.stringify({ powerupId: "vault-does-not-exist" }),
  });
  check("unknown powerup is rejected", poor.status === 404);

  sockA = connect(cookieA);
  sockB = connect(cookieB);
  const questionA = collector(sockA, "arena:question");
  const questionB = collector(sockB, "arena:question");
  const hellos = collector(sockA, "arena:hello");
  const revealA = collector(sockA, "arena:reveal");
  collector(sockB, "arena:reveal");
  const resultA = collector(sockA, "arena:result");
  const resultB = collector(sockB, "arena:result");

  await Promise.all([waitFor(sockA, "connect", () => true, 10000), waitFor(sockB, "connect", () => true, 10000)]);
  check("both arena sockets authenticate", sockA.connected && sockB.connected);

  const helloA = await hellos(() => true, 10000);
  check(
    "arena hello carries arena region, rating and inventory",
    helloA.arenaRegion === "IN" && helloA.rating === 1000 && helloA.inventory?.fifty === 1,
    `region ${helloA.arenaRegion}, rating ${helloA.rating}`
  );

  // Player A queues alone; player B (a different world region) joins and the
  // global skill queue pairs them immediately.
  const matchedA = waitFor(sockA, "arena:matched");
  const matchedB = waitFor(sockB, "arena:matched");
  sockA.emit("arena:join");
  const queued = await waitFor(sockA, "arena:queued", () => true, 8000);
  check(
    "first player enters the global queue",
    queued.arenaRegion === "IN" && queued.total >= 1 && queued.rating === 1000,
    `total ${queued.total}, band ${queued.band}`
  );

  sockB.emit("arena:join");
  const [ma, mb] = await Promise.all([matchedA, matchedB]);
  await new Promise((r) => setTimeout(r, 400));

  check(
    "players from different world regions are matched together",
    ma.matchId === mb.matchId && ma.opponent.id === idB && mb.opponent.id === idA,
    `${ma.matchId.slice(0, 8)}…`
  );
  check(
    "opponent cards carry each player's own arena region",
    ma.you.region === "IN" && ma.opponent.region === "US" &&
      mb.you.region === "US" && mb.opponent.region === "IN",
    `A sees ${ma.opponent.region}, B sees ${mb.opponent.region}`
  );
  check(
    "both players receive the same questions in the same order",
    JSON.stringify(ma.questions.map((q) => q.prompt)) === JSON.stringify(mb.questions.map((q) => q.prompt))
  );
  check("questions never leak the answer", ma.questions.every((q) => q.correct === undefined));

  // round 1: A uses 50:50, both answer
  await questionA((q) => q.index === 0);
  const applied = waitFor(sockA, "arena:powerup:applied", (d) => d.powerupId === "fifty");
  const fiftyAck = await emitAck(sockA, "arena:powerup", { matchId: ma.matchId, powerupId: "fifty" });
  const fiftyEffect = await applied;
  check(
    "50:50 removes two wrong options and one charge",
    fiftyAck.ok && Array.isArray(fiftyEffect.hide) && fiftyEffect.hide.length === 2 && fiftyAck.qty === 0,
    `hide ${JSON.stringify(fiftyEffect.hide)}`
  );

  await emitAck(sockA, "arena:answer", { matchId: ma.matchId, index: 0, choice: 0 });
  await questionB((q) => q.index === 0);
  await emitAck(sockB, "arena:answer", { matchId: mb.matchId, index: 0, choice: 0 });
  await revealA((r) => r.index === 0);

  // round 2: A skips, B answers
  await questionA((q) => q.index === 1);
  const skipAck = await emitAck(sockA, "arena:powerup", { matchId: ma.matchId, powerupId: "skip" });
  check("skip burns a question and consumes the charge", skipAck.ok && skipAck.qty === 0);
  await questionB((q) => q.index === 1);
  await emitAck(sockB, "arena:answer", { matchId: mb.matchId, index: 1, choice: 2 });
  await revealA((r) => r.index === 1);

  // rounds 3-5: both answer fast
  for (let i = 2; i <= 4; i++) {
    await Promise.all([questionA((q) => q.index === i), questionB((q) => q.index === i)]);
    await emitAck(sockA, "arena:answer", { matchId: ma.matchId, index: i, choice: 1 });
    await emitAck(sockB, "arena:answer", { matchId: mb.matchId, index: i, choice: 3 });
    await revealA((r) => r.index === i);
  }

  const [ra, rb] = await Promise.all([resultA(), resultB()]);
  check(
    "both players receive a result tagged with their own arena region",
    ra.matchId === rb.matchId && ra.region === "IN" && rb.region === "US" && Boolean(ra.you) && Boolean(rb.you),
    `A ${ra.region}, B ${rb.region}`
  );

  const winner = ra.you.won ? "A" : rb.you.won ? "B" : "draw";
  const winnerResult = ra.you.won ? ra : rb;
  const loserResult = ra.you.won ? rb : ra;
  const expectedReward = winner === "draw" ? 0 : Math.min(60, winnerResult.you.correct * 10);
  check(
    "winner reward equals 10 credits per correct answer, capped at 60",
    winnerResult.you.credits === expectedReward,
    `${winner} scored ${winnerResult.you.score}, ${winnerResult.you.correct} correct, +${winnerResult.you.credits}`
  );
  if (winner !== "draw") {
    check("loser receives no credits", loserResult.you.credits === 0);
  }

  check(
    "skill rating moves in opposite directions for winner and loser",
    typeof ra.you.rating === "number" &&
      typeof rb.you.rating === "number" &&
      (winner === "draw"
        ? ra.you.rating === 1000 && rb.you.rating === 1000
        : winnerResult.you.rating > 1000 && loserResult.you.rating < 1000),
    `A ${ra.you.rating} (${ra.you.ratingDelta >= 0 ? "+" : ""}${ra.you.ratingDelta}), B ${rb.you.rating} (${rb.you.ratingDelta >= 0 ? "+" : ""}${rb.you.ratingDelta})`
  );

  const row = db.prepare("SELECT * FROM arena_matches WHERE id = ?").get(ma.matchId);
  check(
    "match is persisted with both arena regions and the right winner",
    row &&
      row.status === "finished" &&
      row.p1_region === "IN" &&
      row.p2_region === "US" &&
      (winner === "draw" ? row.winner_id === null : row.winner_id === winnerResult.you.id),
    `status ${row?.status}, regions ${row?.p1_region}/${row?.p2_region}`
  );

  const statsRows = db.prepare("SELECT * FROM arena_stats WHERE user_id IN (?,?)").all(idA, idB);
  check(
    "stats rows persist ratings for both players",
    statsRows.length === 2 &&
      statsRows.every((s) => s.matches === 1 && Number.isInteger(s.rating)) &&
      statsRows.some((s) => s.rating !== 1000),
    statsRows.map((s) => `#${s.user_id}:${s.rating}`).join(" ")
  );

  const answerRows = db.prepare("SELECT COUNT(*) AS c FROM arena_answers WHERE match_id = ?").get(ma.matchId);
  check("every answer is stored for audit", Number(answerRows.c) >= 9, `${answerRows.c} answers`);

  const creditsNow = db.prepare("SELECT credits FROM users WHERE id = ?").get(idA).credits;
  check("credits are written to the winner's account", creditsNow === 65 + winnerResult.you.credits * (winner === "A" ? 1 : 0));

  const ladder = await fetch(`${BASE}/leaderboard`, { headers: { Cookie: cookieA } }).then((r) => r.text());
  check(
    "finished battle appears on the region-wise ladder",
    ladder.includes("Arena Tester A") && ladder.includes("India quiz ladder")
  );

  const history = await fetch(`${BASE}/arena`, { headers: { Cookie: cookieA } }).then((r) => r.text());
  check("arena page lists the recent battle", history.includes("Recent battles"));
} catch (err) {
  check("test run completed without exceptions", false, err?.stack || err?.message || String(err));
} finally {
  try {
    sockA?.close();
    sockB?.close();
  } catch {}
  if (ids.length) {
    const del = (sql, ...params) => {
      try {
        db.prepare(sql).run(...params);
      } catch (err) {
        console.error("cleanup:", err.message);
      }
    };
    for (const id of ids) {
      del("DELETE FROM arena_answers WHERE user_id = ?", id);
      del("DELETE FROM arena_matches WHERE p1 = ? OR p2 = ?", id, id);
      del("DELETE FROM arena_stats WHERE user_id = ?", id);
      del("DELETE FROM user_powerups WHERE user_id = ?", id);
      del("DELETE FROM transactions WHERE user_id = ?", id);
      del("DELETE FROM notifications WHERE user_id = ?", id);
      del("DELETE FROM users WHERE id = ?", id);
    }
    console.log(`cleaned up temp users ${ids.join(", ")}`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.error("FAILED:", failed.map((f) => f.name).join("; "));
  process.exit(1);
}
process.exit(0);
