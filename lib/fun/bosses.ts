import "server-only";
import { all, now, one, run, type User } from "../db";
import { isPremium } from "../plans";
import { daysLeftInMonth, monthKeyFor } from "./day";

/**
 * Monthly boss battles. A boss is a short, hard paper drawn from the authored
 * final-assessment bank, with a time limit and a pass mark. Questions are
 * snapshotted on the attempt so a later bank edit cannot change a live fight.
 * Rewards are paid once per calendar month, on the first pass only; retakes
 * stay available as practice.
 */
export const BOSS_QUESTIONS = 10;
export const BOSS_PASS_PCT = 70;
export const BOSS_DURATION_MS = 8 * 60_000;
export const BOSS_REWARD_CREDITS = 120;
export const BOSS_REWARD_XP = 150;

export type BossDef = {
  key: string;
  name: string;
  tagline: string;
  brief: string;
  focus: string;
  accent: "amber" | "violet" | "cyan" | "green";
};

const BOSSES: BossDef[] = [
  {
    key: "rate-shock",
    name: "The Rate Shock",
    tagline: "The central bank moves against you.",
    brief:
      "Bond yields jump, growth names wobble and the currency swings. Answer under pressure and show you can read the chain reaction.",
    focus: "Rates and valuation",
    accent: "amber",
  },
  {
    key: "inflation-squeeze",
    name: "The Inflation Squeeze",
    tagline: "Costs rise. Margins shrink.",
    brief:
      "Input costs climb faster than selling prices. Separate the businesses that can pass costs on from the ones that cannot.",
    focus: "Margins and pricing power",
    accent: "violet",
  },
  {
    key: "liquidity-crunch",
    name: "The Liquidity Crunch",
    tagline: "Sellers everywhere. Buyers disappear.",
    brief:
      "Spreads widen and exits get expensive. Prove you understand liquidity, slippage and why position size is a risk control.",
    focus: "Risk and execution",
    accent: "cyan",
  },
  {
    key: "earnings-gauntlet",
    name: "The Earnings Gauntlet",
    tagline: "One quarter. No room for guesswork.",
    brief:
      "Revenue beats, margin misses and guidance cuts land together. Read the balance sheet before you react to the headline.",
    focus: "Financial statements",
    accent: "green",
  },
  {
    key: "currency-storm",
    name: "The Currency Storm",
    tagline: "The rupee and the dollar pull in opposite directions.",
    brief:
      "A weaker currency changes import costs, overseas earnings and the value of everything you hold. Track the second-order effects.",
    focus: "Currencies and exposure",
    accent: "amber",
  },
  {
    key: "crypto-winter",
    name: "The Crypto Winter",
    tagline: "The market thaws. Trust does not.",
    brief:
      "Volatility spikes and the headlines turn hostile. Show that you size positions and manage drawdowns instead of chasing candles.",
    focus: "Volatility and discipline",
    accent: "violet",
  },
];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The boss that is live for a given UTC month, rotating through the set. */
export function bossForMonth(monthKey = monthKeyFor()): BossDef {
  return BOSSES[hash(monthKey) % BOSSES.length];
}

type QuestionRow = {
  id: number;
  prompt: string;
  options: string;
  correct: number;
  explanation: string;
  module: string;
  difficulty: string;
};

type BossRow = {
  id: number;
  user_id: number;
  boss_key: string;
  month_key: string;
  question_ids: string;
  started_at: number;
  ends_at: number;
  submitted_at: number | null;
  score: number;
  total: number;
  passed: number;
  xp: number;
  credits: number;
};

export type BossQuestion = { id: number; prompt: string; options: string[]; module: string };

export type BossReview = {
  id: number;
  prompt: string;
  options: string[];
  choice: number | null;
  correct: number;
  ok: boolean;
  explanation: string;
  module: string;
};

function parseOptions(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function bankQuestions(limit: number) {
  return all<QuestionRow>(
    `SELECT q.id, q.prompt, q.options, q.correct, q.explanation,
            m.title AS module, q.difficulty
       FROM final_exam_questions q
       JOIN modules m ON m.slug = q.module_slug
      WHERE m.is_published = 1
      ORDER BY CASE q.difficulty
                 WHEN 'hard' THEN 0
                 WHEN 'moderate' THEN 1
                 ELSE 2
               END,
               RANDOM()
      LIMIT ${limit}`
  );
}

function hydrate(ids: number[]): BossQuestion[] {
  if (ids.length === 0) return [];
  const holes = ids.map(() => "?").join(",");
  const rows = all<QuestionRow>(
    `SELECT q.id, q.prompt, q.options, q.correct, q.explanation,
            m.title AS module, q.difficulty
       FROM final_exam_questions q
       JOIN modules m ON m.slug = q.module_slug
      WHERE q.id IN (${holes})`,
    ...ids
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [{ id: row.id, prompt: row.prompt, options: parseOptions(row.options), module: row.module }];
  });
}

export type BossStatus = {
  premium: boolean;
  monthKey: string;
  boss: BossDef;
  daysLeft: number;
  attempts: number;
  bestPercent: number | null;
  passed: boolean;
  rewarded: boolean;
  activeAttemptId: number | null;
  reward: { credits: number; xp: number };
  passMark: number;
  questions: number;
  durationMs: number;
};

type BossUser = Pick<User, "id" | "role" | "plan" | "premium_until" | "institution_access">;

export function bossStatus(user: BossUser): BossStatus {
  const monthKey = monthKeyFor();
  const boss = bossForMonth(monthKey);
  const rows = all<Pick<BossRow, "id" | "score" | "total" | "passed" | "submitted_at" | "ends_at" | "credits">>(
    `SELECT id, score, total, passed, submitted_at, ends_at, credits
       FROM boss_attempts
      WHERE user_id = ? AND month_key = ?
      ORDER BY started_at DESC`,
    user.id,
    monthKey
  );
  const finished = rows.filter((row) => row.submitted_at);
  const bestPercent =
    finished.length > 0
      ? Math.round(
          Math.max(...finished.map((row) => (row.total > 0 ? (row.score / row.total) * 100 : 0)))
        )
      : null;
  const active = rows.find((row) => !row.submitted_at && now() <= row.ends_at);

  return {
    premium: isPremium(user as User),
    monthKey,
    boss,
    daysLeft: daysLeftInMonth(),
    attempts: finished.length,
    bestPercent,
    passed: finished.some((row) => row.passed === 1),
    rewarded: finished.some((row) => row.passed === 1 && row.credits > 0),
    activeAttemptId: active?.id ?? null,
    reward: { credits: BOSS_REWARD_CREDITS, xp: BOSS_REWARD_XP },
    passMark: BOSS_PASS_PCT,
    questions: BOSS_QUESTIONS,
    durationMs: BOSS_DURATION_MS,
  };
}

export type StartBossResult = {
  attemptId: number;
  boss: BossDef;
  monthKey: string;
  questions: BossQuestion[];
  startedAt: number;
  endsAt: number;
  durationMs: number;
  passMark: number;
  resumed: boolean;
};

export function startBoss(user: BossUser): StartBossResult {
  if (!isPremium(user as User)) {
    throw new Error("Boss battles are included with Premium.");
  }
  const monthKey = monthKeyFor();
  const boss = bossForMonth(monthKey);

  const active = one<BossRow>(
    `SELECT * FROM boss_attempts
      WHERE user_id = ? AND month_key = ? AND submitted_at IS NULL
      ORDER BY started_at DESC LIMIT 1`,
    user.id,
    monthKey
  );
  if (active && now() <= active.ends_at) {
    const ids = JSON.parse(active.question_ids) as number[];
    return {
      attemptId: active.id,
      boss,
      monthKey,
      questions: hydrate(ids),
      startedAt: active.started_at,
      endsAt: active.ends_at,
      durationMs: BOSS_DURATION_MS,
      passMark: BOSS_PASS_PCT,
      resumed: true,
    };
  }
  if (active) {
    run("UPDATE boss_attempts SET submitted_at = ? WHERE id = ?", now(), active.id);
  }

  const rows = bankQuestions(BOSS_QUESTIONS);
  if (rows.length < BOSS_QUESTIONS) {
    throw new Error("The boss question bank is not ready yet.");
  }
  const ids = rows.map((row) => row.id);
  const startedAt = now();
  const endsAt = startedAt + BOSS_DURATION_MS;
  const result = run(
    `INSERT INTO boss_attempts
       (user_id, boss_key, month_key, question_ids, started_at, ends_at, total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    user.id,
    boss.key,
    monthKey,
    JSON.stringify(ids),
    startedAt,
    endsAt,
    ids.length
  );

  return {
    attemptId: Number(result.lastId),
    boss,
    monthKey,
    questions: hydrate(ids),
    startedAt,
    endsAt,
    durationMs: BOSS_DURATION_MS,
    passMark: BOSS_PASS_PCT,
    resumed: false,
  };
}

export type SubmitBossResult = {
  attemptId: number;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  passMark: number;
  boss: BossDef;
  review: BossReview[];
  xp: number;
  credits: number;
  firstPass: boolean;
  status: BossStatus;
};

export function submitBoss(
  user: BossUser,
  attemptId: number,
  answers: Array<{ id: number; choice: number }>
): SubmitBossResult {
  const attempt = one<BossRow>(
    "SELECT * FROM boss_attempts WHERE id = ? AND user_id = ?",
    attemptId,
    user.id
  );
  if (!attempt) throw new Error("Boss attempt not found.");
  if (attempt.submitted_at) throw new Error("That boss attempt is already closed.");
  if (now() > attempt.ends_at + 10_000) {
    run("UPDATE boss_attempts SET submitted_at = ? WHERE id = ?", now(), attempt.id);
    throw new Error("Time is up for that boss attempt.");
  }

  const ids = JSON.parse(attempt.question_ids) as number[];
  const holes = ids.map(() => "?").join(",");
  const rows = all<QuestionRow>(
    `SELECT q.id, q.prompt, q.options, q.correct, q.explanation,
            m.title AS module, q.difficulty
       FROM final_exam_questions q
       JOIN modules m ON m.slug = q.module_slug
      WHERE q.id IN (${holes})`,
    ...ids
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  const chosen = new Map<number, number>();
  for (const answer of answers) {
    if (Number.isInteger(answer.id) && Number.isInteger(answer.choice)) {
      chosen.set(answer.id, answer.choice);
    }
  }

  let score = 0;
  const review: BossReview[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    const choice = chosen.has(id) ? chosen.get(id)! : null;
    const ok = choice === row.correct;
    if (ok) score += 1;
    review.push({
      id: row.id,
      prompt: row.prompt,
      options: parseOptions(row.options),
      choice,
      correct: row.correct,
      ok,
      explanation: row.explanation,
      module: row.module,
    });
  }

  const total = review.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = percent >= BOSS_PASS_PCT;

  const priorPass = one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM boss_attempts
      WHERE user_id = ? AND month_key = ? AND passed = 1 AND id <> ? AND credits > 0`,
    user.id,
    attempt.month_key,
    attempt.id
  );
  const firstPass = passed && (priorPass?.c ?? 0) === 0;
  const xp = firstPass ? BOSS_REWARD_XP : 0;
  const credits = firstPass ? BOSS_REWARD_CREDITS : 0;

  run(
    `UPDATE boss_attempts
        SET submitted_at = ?, score = ?, total = ?, passed = ?, xp = ?, credits = ?
      WHERE id = ?`,
    now(),
    score,
    total,
    passed ? 1 : 0,
    xp,
    credits,
    attempt.id
  );

  if (xp > 0 || credits > 0) {
    run(
      "UPDATE users SET xp = xp + ?, credits = credits + ? WHERE id = ?",
      xp,
      credits,
      user.id
    );
    run(
      "INSERT INTO activity (user_id, type, text, created_at) VALUES (?, 'reward', ?, ?)",
      user.id,
      `Boss defeated: ${bossForMonth(attempt.month_key).name} — ${percent}%`,
      now()
    );
    run(
      "INSERT INTO notifications (user_id, type, title, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      user.id,
      "success",
      "Boss defeated",
      `You beat ${bossForMonth(attempt.month_key).name} with ${percent}%. ${credits} credits and ${xp} XP added.`,
      now()
    );
  }

  return {
    attemptId: attempt.id,
    score,
    total,
    percent,
    passed,
    passMark: BOSS_PASS_PCT,
    boss: bossForMonth(attempt.month_key),
    review,
    xp,
    credits,
    firstPass,
    status: bossStatus(user),
  };
}

export type BossHistoryRow = {
  id: number;
  monthKey: string;
  boss: BossDef;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  playedAt: number;
};

export function bossHistory(userId: number, limit = 6): BossHistoryRow[] {
  const rows = all<BossRow>(
    `SELECT * FROM boss_attempts
      WHERE user_id = ? AND submitted_at IS NOT NULL
      ORDER BY submitted_at DESC LIMIT ?`,
    userId,
    limit
  );
  return rows.map((row) => ({
    id: row.id,
    monthKey: row.month_key,
    boss: bossForMonth(row.month_key),
    score: row.score,
    total: row.total,
    percent: row.total > 0 ? Math.round((row.score / row.total) * 100) : 0,
    passed: row.passed === 1,
    playedAt: row.submitted_at ?? row.started_at,
  }));
}
