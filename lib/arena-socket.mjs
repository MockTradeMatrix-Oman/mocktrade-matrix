/**
 * Realtime quiz arena.
 *
 * Runs inside server.mjs (same Node process as Next) and owns:
 *   - one global, skill-based matchmaking queue
 *   - the authoritative question clock and scoring
 *   - powerup inventory and effects
 *   - match / stats persistence in the shared SQLite file
 *
 * Clients never decide a score. They only send "I picked option N"; the server
 * checks the clock, records the answer and broadcasts progress.
 */

import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { buildMatchQuestions } from "./arena-questions.mjs";

const POWERUPS = JSON.parse(readFileSync(new URL("./powerups.json", import.meta.url), "utf8"));
const POWERUP_BY_ID = new Map(POWERUPS.map((p) => [p.id, p]));

const QUESTION_COUNT = 5;
const QUESTION_MS = 12_000;
const LOBBY_MS = 5_000;
const REVEAL_MS = 1_900;
const DISCONNECT_GRACE_MS = 12_000;
const REWARD_PER_CORRECT = 10;
const MAX_REWARD = 60;
const FORFEIT_REWARD = 15;

// Skill matchmaking. Ratings are Elo-style and separate from credits: credits
// measure earnings, rating measures how well you beat comparable opponents.
const START_RATING = 1000;
const RATING_K = 32;
const QUEUE_TICK_MS = 2_000;
const BAND_STEPS_MS = [8_000, 16_000, 26_000];
const BAND_STEPS = [120, 300, 600, Number.POSITIVE_INFINITY];

const SCHEMA = `
  PRAGMA foreign_keys = ON;
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
  CREATE INDEX IF NOT EXISTS idx_arena_stats_credits ON arena_stats(credits_won DESC, wins DESC);
  CREATE INDEX IF NOT EXISTS idx_arena_matches_region ON arena_matches(region, started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_arena_answers_match ON arena_answers(match_id);
`;

export function attachArena(io, { dbPath }) {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 20000;");
  db.exec(SCHEMA);

  // Additive migrations for arenas created before skill matching existed.
  const columnsOf = (table) =>
    db.prepare(`PRAGMA table_info(${table})`).all().map((c) => String(c.name));
  if (!columnsOf("arena_stats").includes("rating")) {
    db.exec("ALTER TABLE arena_stats ADD COLUMN rating INTEGER NOT NULL DEFAULT 1000");
    db.prepare(
      "UPDATE arena_stats SET rating = MAX(400, 1000 + wins * 24 - losses * 12 + draws * 4) WHERE matches > 0"
    ).run();
  }
  if (!columnsOf("arena_matches").includes("p1_region")) {
    db.exec("ALTER TABLE arena_matches ADD COLUMN p1_region TEXT NOT NULL DEFAULT ''");
  }
  if (!columnsOf("arena_matches").includes("p2_region")) {
    db.exec("ALTER TABLE arena_matches ADD COLUMN p2_region TEXT NOT NULL DEFAULT ''");
  }

  // A restart cannot resume in-memory matches; close them out honestly.
  db.prepare("UPDATE arena_matches SET status = 'abandoned', ended_at = ? WHERE status = 'live'").run(Date.now());

  // One global queue: skill decides the pairing, not geography.
  const queue = [];
  const queuedUser = new Map(); // userId -> entry
  const matches = new Map(); // matchId -> match
  const matchByUser = new Map(); // userId -> matchId

  const q = {
    user: db.prepare("SELECT id, name, avatar, region, arena_region FROM users WHERE id = ?"),
    credits: db.prepare("SELECT credits, xp, start_capital FROM users WHERE id = ?"),
    insertMatch: db.prepare(`INSERT INTO arena_matches
      (id,region,p1,p2,p1_name,p2_name,p1_region,p2_region,questions,status,started_at)
      VALUES (?,?,?,?,?,?,?,?,?,'live',?)`),
    finishMatch: db.prepare(`UPDATE arena_matches SET
      p1_score=?, p2_score=?, p1_correct=?, p2_correct=?, p1_ms=?, p2_ms=?,
      winner_id=?, reason=?, credits_awarded=?, status='finished', ended_at=?
      WHERE id=?`),
    answer: db.prepare(`INSERT INTO arena_answers (match_id,user_id,q_index,choice,correct,ms)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(match_id,user_id,q_index) DO UPDATE SET
        choice=excluded.choice, correct=excluded.correct, ms=excluded.ms`),
    stats: db.prepare(`INSERT INTO arena_stats
      (user_id,matches,wins,losses,draws,correct,answered,best_streak,credits_won,rating,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET
        matches = matches + excluded.matches,
        wins = wins + excluded.wins,
        losses = losses + excluded.losses,
        draws = draws + excluded.draws,
        correct = correct + excluded.correct,
        answered = answered + excluded.answered,
        best_streak = MAX(best_streak, excluded.best_streak),
        credits_won = credits_won + excluded.credits_won,
        rating = excluded.rating,
        updated_at = excluded.updated_at`),
    addCredits: db.prepare("UPDATE users SET credits = credits + ?, xp = xp + ? WHERE id = ?"),
    transaction: db.prepare(`INSERT INTO transactions (user_id,kind,amount,bucket,note,created_at)
      VALUES (?,?,?,?,?,?)`),
    notify: db.prepare(`INSERT INTO notifications (user_id,type,title,body,read,created_at)
      VALUES (?,?,?,?,0,?)`),
  };

  function safe(label, fn) {
    try {
      return fn();
    } catch (err) {
      console.error(`  [arena] ${label}:`, err?.message || err);
      return undefined;
    }
  }

  function inventoryFor(userId) {
    const rows = db.prepare("SELECT powerup_id, qty FROM user_powerups WHERE user_id = ?").all(userId);
    const map = {};
    for (const p of POWERUPS) map[p.id] = 0;
    for (const row of rows) map[row.powerup_id] = row.qty;
    return map;
  }

  function statsFor(userId) {
    return db.prepare("SELECT * FROM arena_stats WHERE user_id = ?").get(userId) ?? null;
  }

  function ladderFor(region, limit = 5) {
    return db.prepare(`SELECT u.id, u.name, u.avatar, u.arena_region, s.matches, s.wins, s.losses,
        s.draws, s.correct, s.answered, s.credits_won, s.rating
      FROM arena_stats s JOIN users u ON u.id = s.user_id
      WHERE u.role = 'user'
        AND COALESCE(NULLIF(u.arena_region, ''), CASE WHEN u.region = 'US' THEN 'US' ELSE 'IN' END) = ?
      ORDER BY s.rating DESC, s.wins DESC, s.matches ASC
      LIMIT ?`).all(region, limit);
  }

  function queueCounts() {
    return { total: queue.length };
  }

  function broadcastQueue() {
    io.emit("arena:queue", { counts: queueCounts(), total: queuedUser.size });
  }

  function sanitize(question) {
    return {
      id: question.id,
      cat: question.cat,
      level: question.level,
      prompt: question.q,
      options: question.options,
    };
  }

  function newPlayer(entry) {
    return {
      id: entry.userId,
      name: entry.name,
      avatar: entry.avatar,
      socketId: entry.socketId,
      rating: entry.rating ?? START_RATING,
      arenaRegion: entry.arenaRegion ?? "",
      marketRegion: entry.marketRegion === "US" ? "US" : "IN",
      score: 0,
      correct: 0,
      answered: 0,
      ms: 0,
      streak: 0,
      best: 0,
      doubleNext: false,
      deadline: 0,
      answeredIndex: -1,
      used: new Set(),
      connected: true,
      forfeitTimer: null,
    };
  }

  function playersOf(match) {
    const list = Object.values(match.players);
    return [list[0], list[1]];
  }

  function opponentOf(match, userId) {
    return playersOf(match).find((p) => p.id !== userId);
  }

  function emitBoth(match, event, payload) {
    for (const p of playersOf(match)) io.to(`user:${p.id}`).emit(event, payload);
  }

  function emitTo(match, userId, event, payload) {
    io.to(`user:${userId}`).emit(event, payload);
  }

  function clearTimers(match) {
    for (const t of match.timers) clearTimeout(t);
    match.timers.clear();
  }

  function later(match, fn, ms) {
    const t = setTimeout(() => {
      match.timers.delete(t);
      safe("timer", fn);
    }, ms);
    match.timers.add(t);
    return t;
  }

  /* ---------------- matchmaking ---------------- */

  // How wide a rating gap is acceptable. The band widens the longer somebody
  // waits, so a strong player still finds a game instead of waiting forever.
  function bandFor(entry) {
    const waited = Date.now() - entry.joinedAt;
    let step = 0;
    while (step < BAND_STEPS_MS.length && waited >= BAND_STEPS_MS[step]) step += 1;
    return BAND_STEPS[Math.min(step, BAND_STEPS.length - 1)];
  }

  function removeFromQueue(userId) {
    const index = queue.findIndex((e) => e.userId === userId);
    if (index >= 0) queue.splice(index, 1);
    queuedUser.delete(userId);
  }

  function findOpponent(entry) {
    let best = null;
    for (const other of queue) {
      if (other.userId === entry.userId) continue;
      const gap = Math.abs(other.rating - entry.rating);
      const allowed = Math.max(bandFor(entry), bandFor(other));
      if (gap <= allowed && (!best || gap < best.gap)) best = { entry: other, gap };
    }
    return best?.entry ?? null;
  }

  function tryPair(entry) {
    if (!queuedUser.has(entry.userId)) return false;
    const opponent = findOpponent(entry);
    if (!opponent) return false;
    removeFromQueue(entry.userId);
    removeFromQueue(opponent.userId);
    startMatch(opponent, entry);
    return true;
  }

  // Bands widen with time, so the queue is re-checked on a short tick even
  // when nobody new joins.
  function sweepQueue() {
    if (queue.length < 2) return;
    const waiting = [...queue].sort((a, b) => a.joinedAt - b.joinedAt);
    for (const entry of waiting) {
      if (queuedUser.has(entry.userId)) tryPair(entry);
    }
    if (queue.length) broadcastQueue();
  }

  const sweepTimer = setInterval(() => safe("sweep", sweepQueue), QUEUE_TICK_MS);
  sweepTimer.unref?.();

  function startMatch(a, b) {
    // Questions use one currency so both players read the same numbers. Mixed
    // market regions get USD, the shared convention.
    const region = a.marketRegion === b.marketRegion ? a.marketRegion : "US";
    const questions = buildMatchQuestions(region, QUESTION_COUNT);
    const id = randomUUID();
    const now = Date.now();
    const match = {
      id,
      region,
      questions,
      startedAt: now,
      index: -1,
      status: "live",
      qClosed: true,
      questionStartedAt: 0,
      players: { [a.userId]: newPlayer(a), [b.userId]: newPlayer(b) },
      timers: new Set(),
      round: null,
    };
    matches.set(id, match);
    matchByUser.set(a.userId, id);
    matchByUser.set(b.userId, id);

    safe("insert match", () =>
      q.insertMatch.run(
        id, region, a.userId, b.userId, a.name, b.name,
        a.arenaRegion, b.arenaRegion, questions.length, now
      )
    );

    const base = {
      matchId: id,
      total: questions.length,
      startsAt: now + LOBBY_MS,
      serverNow: now,
      questionMs: QUESTION_MS,
      questions: questions.map(sanitize),
    };

    for (const p of playersOf(match)) {
      const opp = opponentOf(match, p.id);
      io.to(`user:${p.id}`).emit("arena:matched", {
        ...base,
        you: { id: p.id, name: p.name, avatar: p.avatar, region: p.arenaRegion, rating: p.rating },
        opponent: { id: opp.id, name: opp.name, avatar: opp.avatar, region: opp.arenaRegion, rating: opp.rating },
      });
    }
    broadcastQueue();

    later(match, () => runQuestion(match, 0), LOBBY_MS);
  }

  function runQuestion(match, index) {
    if (match.status !== "live") return;
    const question = match.questions[index];
    if (!question) return finishMatch(match, "complete", null);

    const now = Date.now();
    match.index = index;
    match.qClosed = false;
    match.questionStartedAt = now;
    match.round = index;

    for (const p of playersOf(match)) {
      p.deadline = now + QUESTION_MS;
      p.answeredIndex = -1;
      const opp = opponentOf(match, p.id);
      io.to(`user:${p.id}`).emit("arena:question", {
        matchId: match.id,
        index,
        total: match.questions.length,
        prompt: question.q,
        options: question.options,
        cat: question.cat,
        level: question.level,
        endsAt: p.deadline,
        serverNow: now,
        you: { score: p.score, streak: p.streak },
        opponent: { score: opp.score },
      });
    }

    later(match, () => finishQuestion(match, index), QUESTION_MS + 700);
  }

  function finishQuestion(match, index) {
    if (match.status !== "live" || match.index !== index || match.qClosed) return;
    match.qClosed = true;
    const question = match.questions[index];
    const scores = {};
    for (const p of playersOf(match)) scores[p.id] = p.score;

    emitBoth(match, "arena:reveal", {
      matchId: match.id,
      index,
      correct: question.correct,
      why: question.why,
      scores,
      serverNow: Date.now(),
    });

    const last = index >= match.questions.length - 1;
    later(match, () => {
      if (last) finishMatch(match, "complete", null);
      else runQuestion(match, index + 1);
    }, REVEAL_MS);
  }

  /* ---------------- scoring ---------------- */

  function recordAnswer(match, player, choice, ms) {
    const question = match.questions[match.index];
    const correct = choice >= 0 && choice === question.correct;
    player.answered += 1;
    player.answeredIndex = match.index;
    player.ms += Math.max(0, Math.min(Math.round(ms), QUESTION_MS));
    if (correct) {
      player.correct += 1;
      player.streak += 1;
      player.best = Math.max(player.best, player.streak);
      player.score += player.doubleNext ? 2 : 1;
      player.doubleNext = false;
    } else {
      player.streak = 0;
    }
    safe("answer", () =>
      q.answer.run(match.id, player.id, match.index, choice, correct ? 1 : 0, Math.round(ms))
    );
    return correct;
  }

  function bothAnswered(match) {
    return playersOf(match).every((p) => p.answeredIndex === match.index);
  }

  function finishMatch(match, reason, forfeiterId) {
    if (match.status !== "live") return;
    match.status = "finished";
    clearTimers(match);

    const [p1, p2] = playersOf(match);
    let winner = null;

    // An opponent who never answered should not win a speed tiebreak with a
    // zero millisecond total. Only answered questions count toward pace.
    const pace = (p) => (p.answered > 0 ? p.ms / p.answered : Number.POSITIVE_INFINITY);

    if (reason === "forfeit" && forfeiterId) {
      winner = p1.id === forfeiterId ? p2 : p1;
    } else if (p1.score > p2.score) {
      winner = p1;
    } else if (p2.score > p1.score) {
      winner = p2;
    } else if (pace(p1) !== pace(p2)) {
      winner = pace(p1) < pace(p2) ? p1 : p2;
    }

    const reward = winner
      ? reason === "forfeit"
        ? FORFEIT_REWARD
        : Math.min(MAX_REWARD, winner.correct * REWARD_PER_CORRECT)
      : 0;
    const now = Date.now();

    // Elo-style rating: beating a stronger opponent moves you further.
    const expected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));
    const actual1 = winner ? (winner.id === p1.id ? 1 : 0) : 0.5;
    const nextRating = {
      [p1.id]: Math.round(p1.rating + RATING_K * (actual1 - expected(p1.rating, p2.rating))),
      [p2.id]: Math.round(p2.rating + RATING_K * (1 - actual1 - expected(p2.rating, p1.rating))),
    };

    safe("finish match", () =>
      q.finishMatch.run(
        p1.score, p2.score, p1.correct, p2.correct, p1.ms, p2.ms,
        winner?.id ?? null, reason ?? "complete", reward, now, match.id
      )
    );

    for (const p of [p1, p2]) {
      const isWinner = winner?.id === p.id;
      const isDraw = !winner;
      safe("stats", () =>
        q.stats.run(
          p.id, 1, isWinner ? 1 : 0, !isWinner && !isDraw ? 1 : 0, isDraw ? 1 : 0,
          p.correct, p.answered, p.best, isWinner ? reward : 0, nextRating[p.id], now
        )
      );
      if (isWinner && reward > 0) {
        safe("credits", () => q.addCredits.run(reward, 30, p.id));
        safe("tx", () =>
          q.transaction.run(p.id, "credit", reward, "credits", `Arena win - ${p.correct} correct`, now)
        );
        const row = safe("credits row", () => q.credits.get(p.id));
        io.to(`user:${p.id}`).emit("credits:update", {
          credits: row?.credits ?? 0,
          delta: reward,
          note: "Quiz arena win",
        });
        safe("notify", () => {
          const r = q.notify.run(
            p.id, "reward", `Arena win: +${reward} credits`,
            `You beat ${opponentOf(match, p.id).name} ${p.score}-${opponentOf(match, p.id).score}. Spend credits in the shop.`,
            now
          );
          io.to(`user:${p.id}`).emit("notification", {
            id: Number(r.lastInsertRowid),
            type: "reward",
            title: `Arena win: +${reward} credits`,
            body: `You beat ${opponentOf(match, p.id).name} ${p.score}-${opponentOf(match, p.id).score}.`,
            created_at: now,
          });
        });
      } else {
        safe("xp", () => db.prepare("UPDATE users SET xp = xp + ? WHERE id = ?").run(12, p.id));
      }
    }

    for (const p of playersOf(match)) {
      const opp = opponentOf(match, p.id);
      const isWinner = winner?.id === p.id;
      io.to(`user:${p.id}`).emit("arena:result", {
        matchId: match.id,
        region: p.arenaRegion,
        reason,
        winnerId: winner?.id ?? null,
        draw: !winner,
        you: {
          id: p.id, score: p.score, correct: p.correct, answered: p.answered, ms: p.ms,
          credits: isWinner ? reward : 0, won: isWinner,
          rating: nextRating[p.id], ratingDelta: nextRating[p.id] - p.rating,
        },
        opponent: {
          id: opp.id, name: opp.name, avatar: opp.avatar, region: opp.arenaRegion,
          score: opp.score, correct: opp.correct, answered: opp.answered, ms: opp.ms,
          rating: nextRating[opp.id],
        },
        total: match.questions.length,
        serverNow: now,
      });
    }

    matchByUser.delete(p1.id);
    matchByUser.delete(p2.id);
    for (const region of new Set([p1.arenaRegion, p2.arenaRegion])) {
      io.emit("arena:ladder", { region, top: safe("ladder", () => ladderFor(region)) ?? [] });
    }

    // Keep the result addressable briefly for late acknowledgements.
    setTimeout(() => matches.delete(match.id), 60_000).unref?.();
  }

  /* ---------------- sockets ---------------- */

  io.on("connection", (socket) => {
    const userId = Number(socket.data.userId);
    if (!userId) return;

    const user = safe("user", () => q.user.get(userId));
    if (!user) return;

    // The market engine already joins this room, but the arena must not depend
    // on it: joins are idempotent and this guarantees match events arrive even
    // if the engine is restarting.
    socket.join(`user:${userId}`);

    socket.emit("arena:hello", {
      region: user.region,
      arenaRegion: user.arena_region || (user.region === "US" ? "US" : "IN"),
      rating: safe("rating", () => statsFor(userId)?.rating) ?? START_RATING,
      counts: queueCounts(),
      inventory: safe("inventory", () => inventoryFor(userId)) ?? {},
      stats: safe("stats", () => statsFor(userId)) ?? null,
      serverNow: Date.now(),
    });

    function leaveQueue() {
      if (!queuedUser.has(userId)) return;
      removeFromQueue(userId);
      socket.emit("arena:queue:left", {});
      broadcastQueue();
    }

    function queueUp(fresh) {
      const marketRegion = fresh.region === "US" ? "US" : "IN";
      const entry = {
        userId,
        socketId: socket.id,
        name: fresh.name,
        avatar: fresh.avatar,
        arenaRegion: fresh.arena_region || (marketRegion === "US" ? "US" : "IN"),
        marketRegion,
        rating: safe("rating", () => statsFor(userId)?.rating) ?? START_RATING,
        joinedAt: Date.now(),
      };

      // Global queue: geography never blocks a match. The pairing below picks
      // the closest rating inside the current band, then widens with wait time.
      removeFromQueue(userId);
      queue.push(entry);
      queuedUser.set(userId, entry);
      socket.emit("arena:queued", {
        arenaRegion: entry.arenaRegion,
        rating: entry.rating,
        position: queue.length,
        total: queue.length,
        band: bandFor(entry),
        since: entry.joinedAt,
        serverNow: Date.now(),
      });
      broadcastQueue();

      tryPair(entry);
    }

    socket.on("arena:join", () => {
      if (matchByUser.has(userId)) {
        socket.emit("arena:error", { message: "You are already in a match." });
        return;
      }

      const fresh = safe("user", () => q.user.get(userId));
      if (!fresh) return;

      if (queuedUser.has(userId)) {
        const entry = queuedUser.get(userId);
        socket.emit("arena:queued", {
          arenaRegion: entry.arenaRegion,
          rating: entry.rating,
          position: queue.findIndex((e) => e.userId === userId) + 1 || 1,
          total: queue.length,
          band: bandFor(entry),
          since: entry.joinedAt,
          serverNow: Date.now(),
        });
        tryPair(entry);
        return;
      }

      queueUp(fresh);
    });

    socket.on("arena:leave", () => leaveQueue());

    socket.on("arena:state", () => {
      const mid = matchByUser.get(userId);
      const match = mid ? matches.get(mid) : null;
      const fresh = safe("user", () => q.user.get(userId)) ?? user;
      const arenaRegion = fresh.arena_region || (fresh.region === "US" ? "US" : "IN");
      const rating = safe("rating", () => statsFor(userId)?.rating) ?? START_RATING;

      if (!match || match.status !== "live") {
        socket.emit("arena:state", {
          region: fresh.region,
          arenaRegion,
          rating,
          counts: queueCounts(),
          queued: queuedUser.has(userId),
          inventory: safe("inventory", () => inventoryFor(userId)) ?? {},
          stats: safe("stats", () => statsFor(userId)) ?? null,
          serverNow: Date.now(),
        });
        return;
      }

      const me = match.players[userId];
      const opp = opponentOf(match, userId);
      if (me) {
        me.socketId = socket.id;
        me.connected = true;
        if (me.forfeitTimer) {
          clearTimeout(me.forfeitTimer);
          me.forfeitTimer = null;
        }
      }
      const question = match.index >= 0 ? match.questions[match.index] : null;
      socket.emit("arena:resume", {
        matchId: match.id,
        region: match.region,
        arenaRegion: me.arenaRegion,
        total: match.questions.length,
        index: match.index,
        startedAt: match.startedAt,
        you: { id: me.id, name: me.name, avatar: me.avatar, score: me.score, region: me.arenaRegion, rating: me.rating },
        opponent: { id: opp.id, name: opp.name, avatar: opp.avatar, score: opp.score, region: opp.arenaRegion, rating: opp.rating },
        questions: match.questions.map(sanitize),
        question:
          question && !match.qClosed
            ? {
                index: match.index,
                prompt: question.q,
                options: question.options,
                cat: question.cat,
                level: question.level,
                endsAt: me.deadline,
                serverNow: Date.now(),
                answered: me.answeredIndex === match.index,
              }
            : null,
        serverNow: Date.now(),
      });
      io.to(`user:${opp.id}`).emit("arena:opponent:online", { matchId: match.id });
    });

    socket.on("arena:answer", (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const match = matches.get(String(payload?.matchId ?? ""));
      if (!match || match.status !== "live") return reply({ ok: false, error: "match_over" });
      if (match.index !== Number(payload?.index)) return reply({ ok: false, error: "not_current" });
      if (match.qClosed) return reply({ ok: false, error: "question_closed" });

      const me = match.players[userId];
      if (!me) return reply({ ok: false, error: "not_in_match" });
      if (me.answeredIndex === match.index) return reply({ ok: false, error: "already_answered" });

      const now = Date.now();
      if (now > me.deadline + 600) {
        return reply({ ok: false, error: "too_late", correct: match.questions[match.index].correct });
      }

      const choice = Math.max(-1, Math.min(3, Number(payload?.choice)));
      const ms = now - match.questionStartedAt;
      const correct = recordAnswer(match, me, choice, ms);
      const opp = opponentOf(match, userId);

      reply({
        ok: true,
        correct,
        correctIndex: match.questions[match.index].correct,
        why: match.questions[match.index].why,
        score: me.score,
      });
      emitBoth(match, "arena:progress", {
        matchId: match.id,
        userId,
        answered: me.answered,
        correct: me.correct,
        score: me.score,
        scores: { [me.id]: me.score, [opp.id]: opp.score },
      });

      if (bothAnswered(match)) later(match, () => finishQuestion(match, match.index), 500);
    });

    socket.on("arena:powerup", (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const match = matches.get(String(payload?.matchId ?? ""));
      if (!match || match.status !== "live") return reply({ ok: false, error: "match_over" });
      const me = match.players[userId];
      if (!me) return reply({ ok: false, error: "not_in_match" });
      if (match.qClosed || match.index < 0) return reply({ ok: false, error: "question_closed" });

      const powerupId = String(payload?.powerupId ?? "");
      const powerup = POWERUP_BY_ID.get(powerupId);
      if (!powerup) return reply({ ok: false, error: "unknown_powerup" });

      if (me.answeredIndex === match.index) {
        return reply({ ok: false, error: "already_answered" });
      }

      const key = `${match.index}:${powerupId}`;
      if (me.used.has(key)) return reply({ ok: false, error: "already_used" });

      const taken = safe("powerup take", () =>
        db.prepare("UPDATE user_powerups SET qty = qty - 1 WHERE user_id = ? AND powerup_id = ? AND qty > 0")
          .run(userId, powerupId)
      );
      if (!taken || Number(taken.changes) !== 1) {
        return reply({ ok: false, error: "none_left" });
      }
      me.used.add(key);

      const opp = opponentOf(match, userId);
      const question = match.questions[match.index];
      const now = Date.now();
      let effect = {};

      if (powerupId === "fifty") {
        const wrong = question.options
          .map((_, i) => i)
          .filter((i) => i !== question.correct);
        const hide = wrong.sort(() => Math.random() - 0.5).slice(0, 2).sort((a, b) => a - b);
        effect = { hide };
        emitTo(match, userId, "arena:powerup:applied", { matchId: match.id, powerupId, hide });
      } else if (powerupId === "freeze") {
        opp.deadline = Math.max(now + 1200, opp.deadline - 4000);
        effect = { endsAt: opp.deadline };
        emitTo(match, opp.id, "arena:powerup:applied", {
          matchId: match.id, powerupId, by: me.name, endsAt: opp.deadline, serverNow: now,
        });
        emitTo(match, userId, "arena:powerup:applied", {
          matchId: match.id, powerupId, endsAt: opp.deadline, serverNow: now,
        });
      } else if (powerupId === "skip") {
        if (me.answeredIndex === match.index) return reply({ ok: false, error: "already_answered" });
        recordAnswer(match, me, -1, 0);
        effect = { skipped: true };
        emitTo(match, userId, "arena:powerup:applied", { matchId: match.id, powerupId });
        emitBoth(match, "arena:progress", {
          matchId: match.id, userId, answered: me.answered, correct: me.correct, score: me.score,
          scores: { [me.id]: me.score, [opp.id]: opp.score },
        });
        if (bothAnswered(match)) later(match, () => finishQuestion(match, match.index), 500);
      } else if (powerupId === "double") {
        me.doubleNext = true;
        effect = { armed: true };
        emitTo(match, userId, "arena:powerup:applied", { matchId: match.id, powerupId });
      }

      emitBoth(match, "arena:powerup:used", { matchId: match.id, userId, powerupId });
      reply({
        ok: true,
        powerupId,
        qty: safe("qty", () => inventoryFor(userId)[powerupId]) ?? 0,
        ...effect,
      });
    });

    socket.on("disconnect", () => {
      leaveQueue();
      const mid = matchByUser.get(userId);
      if (!mid) return;
      const match = matches.get(mid);
      if (!match || match.status !== "live") return;
      const me = match.players[userId];
      const opp = opponentOf(match, userId);
      if (!me) return;

      me.connected = false;
      emitTo(match, opp.id, "arena:opponent:offline", { matchId: match.id, inMs: DISCONNECT_GRACE_MS });
      me.forfeitTimer = setTimeout(() => {
        if (match.status !== "live" || me.connected) return;
        finishMatch(match, "forfeit", userId);
      }, DISCONNECT_GRACE_MS);
      me.forfeitTimer.unref?.();
    });
  });

  return { db, queue, matches };
}
