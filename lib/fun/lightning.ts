import "server-only";
import { all, now, one, run } from "../db";
import { startOfLocalDay } from "./day";

/**
 * Lightning Round: twelve curriculum questions, sixty seconds, server-side
 * scoring. The browser only ever receives prompts and options. Rewards apply
 * to the first three submitted rounds each local day so the mode stays a
 * drill rather than an XP farm.
 */
export const LIGHTNING_QUESTIONS = 12;
export const LIGHTNING_MS = 60_000;
export const LIGHTNING_REWARD_RUNS = 3;

type Row = {
  id: number;
  question_ids: string;
  started_at: number;
  ends_at: number;
  submitted_at: number | null;
  total: number;
  correct: number;
  best_combo: number;
  xp: number;
  credits: number;
};

type QuestionRow = {
  id: number;
  prompt: string;
  options: string;
  correct: number;
  explanation: string;
};

function questionsByIds(ids: number[]): QuestionRow[] {
  if (ids.length === 0) return [];
  const holes = ids.map(() => "?").join(",");
  const rows = all<QuestionRow>(
    `SELECT id, prompt, options, correct, explanation FROM quiz_questions WHERE id IN (${holes})`,
    ...ids
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is QuestionRow => Boolean(r));
}

export type LightningQuestion = { id: number; prompt: string; options: string[] };

export function startLightning(userId: number, region: string) {
  const rows = all<QuestionRow>(
    `SELECT q.id, q.prompt, q.options, q.correct, q.explanation
       FROM quiz_questions q
       JOIN modules m ON m.id = q.module_id
      WHERE m.is_published = 1
      ORDER BY RANDOM()
      LIMIT ${LIGHTNING_QUESTIONS}`
  );
  if (rows.length < 4) throw new Error("The quiz bank is not ready yet.");

  const startedAt = now();
  const endsAt = startedAt + LIGHTNING_MS;
  const ids = rows.map((r) => r.id);
  const result = run(
    `INSERT INTO lightning_runs (user_id, question_ids, started_at, ends_at, total)
     VALUES (?, ?, ?, ?, ?)`,
    userId,
    JSON.stringify(ids),
    startedAt,
    endsAt,
    ids.length
  );

  const questions: LightningQuestion[] = rows.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    options: JSON.parse(r.options) as string[],
  }));

  return { runId: Number(result.lastId), startedAt, endsAt, questions };
}

export function submitLightning(
  userId: number,
  region: string,
  runId: number,
  answers: Array<{ id: number; choice: number }>,
  bestCombo: number
) {
  const row = one<Row>("SELECT * FROM lightning_runs WHERE id = ? AND user_id = ?", runId, userId);
  if (!row) throw new Error("That Lightning Round no longer exists.");
  if (row.submitted_at) throw new Error("That round was already submitted.");
  if (now() > row.ends_at + 10_000) throw new Error("Time is up for that round.");

  const ids = JSON.parse(row.question_ids) as number[];
  const questions = questionsByIds(ids);
  const chosen = new Map(answers.map((a) => [a.id, a.choice]));
  let correct = 0;
  const review = questions.map((q) => {
    const options = JSON.parse(q.options) as string[];
    const pick = chosen.get(q.id);
    const isRight = pick === q.correct;
    if (isRight) correct += 1;
    return {
      id: q.id,
      prompt: q.prompt,
      options,
      correct: q.correct,
      chosen: typeof pick === "number" ? pick : null,
      right: isRight,
      explanation: q.explanation,
    };
  });

  const combo = Math.max(0, Math.min(correct, Math.floor(Number(bestCombo) || 0)));
  const todayStart = startOfLocalDay(now(), region);
  const rewardedToday =
    one<{ c: number }>(
      "SELECT COUNT(*) AS c FROM lightning_runs WHERE user_id = ? AND submitted_at IS NOT NULL AND xp > 0 AND started_at >= ?",
      userId,
      todayStart
    )?.c ?? 0;
  const rewardable = rewardedToday < LIGHTNING_REWARD_RUNS;
  const xp = rewardable ? correct * 6 + combo * 2 : 0;
  const credits = rewardable ? (correct >= 10 ? 5 : correct >= 8 ? 3 : 0) : 0;

  run(
    `UPDATE lightning_runs
        SET submitted_at = ?, correct = ?, best_combo = ?, xp = ?, credits = ?
      WHERE id = ?`,
    now(),
    correct,
    combo,
    xp,
    credits,
    runId
  );
  if (xp > 0 || credits > 0) {
    run("UPDATE users SET xp = xp + ?, credits = credits + ? WHERE id = ?", xp, credits, userId);
  }

  return {
    runId,
    correct,
    total: row.total,
    bestCombo: combo,
    xp,
    credits,
    rewardable,
    rewardRunsLeft: Math.max(0, LIGHTNING_REWARD_RUNS - rewardedToday - (rewardable ? 1 : 0)),
    review,
  };
}

export function lightningSummary(userId: number) {
  const best = one<{ best: number; runs: number }>(
    `SELECT COALESCE(MAX(correct), 0) AS best, COUNT(*) AS runs
       FROM lightning_runs WHERE user_id = ? AND submitted_at IS NOT NULL`,
    userId
  );
  return { best: best?.best ?? 0, runs: best?.runs ?? 0 };
}
