import "server-only";
import { randomBytes } from "node:crypto";
import { all, one, run, now, type User } from "./db";
import type { PublicUser } from "./auth";
import { isPremium, premiumDaysLeft } from "./plans";

/**
 * Final assessment and Completion Merit Certificate.
 *
 * Every score is computed on the server from the published quiz bank. The
 * browser only ever receives prompts and options, never the answer key. A
 * certificate is issued only when all published modules are complete and the
 * learner scores at least 80% on the final assessment.
 */
export const EXAM_PASS_PCT = 80;
export const EXAM_QUESTION_COUNT = 50;
export const EXAM_DURATION_MS = 90 * 60_000;

export type ExamQuestion = {
  id: number;
  prompt: string;
  options: string[];
  module: string;
};

export type ExamReview = {
  id: number;
  prompt: string;
  options: string[];
  choice: number | null;
  correct: number;
  ok: boolean;
  explanation: string;
  module: string;
};

export type ExamModuleScore = {
  module: string;
  correct: number;
  total: number;
};

export type Certificate = {
  id: number;
  serial: string;
  user_id: number;
  name: string;
  score: number;
  modules: number;
  final_exam_id: number;
  issued_at: number;
  revoked: number;
};

export type ExamEligibility = {
  premium: boolean;
  modulesDone: number;
  totalModules: number;
  allComplete: boolean;
  ready: boolean;
  certificate: Certificate | null;
  bestPercent: number | null;
  premiumDays: number;
};

type QuizRow = {
  id: number;
  module_id: number;
  prompt: string;
  options: string;
  correct: number;
  explanation: string;
  module: string;
};

type AttemptRow = {
  id: number;
  user_id: number;
  question_ids: string;
  score: number;
  total: number;
  passed: number;
  answers: string | null;
  status: string;
  started_at: number;
  submitted_at: number | null;
  violations: number;
  question_source: string;
};

type HydratedRow = {
  id: number;
  prompt: string;
  options: string;
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

function counts(userId: number) {
  const rows = all<{ status: string }>(
    `SELECT COALESCE(mp.status, 'locked') AS status
       FROM modules m
       LEFT JOIN module_progress mp ON mp.module_id = m.id AND mp.user_id = ?
      WHERE m.is_published = 1`,
    userId
  );
  const done = rows.filter((row) => row.status === "completed").length;
  return { done, total: rows.length };
}

export function getCertificate(userId: number): Certificate | null {
  return (
    one<Certificate>(
      "SELECT * FROM certificates WHERE user_id = ? AND revoked = 0",
      userId
    ) ?? null
  );
}

export function getCertificateBySerial(serial: string): Certificate | null {
  const clean = serial.trim().toUpperCase();
  if (!/^MTM-[A-Z0-9-]{4,40}$/.test(clean)) return null;
  return one<Certificate>("SELECT * FROM certificates WHERE serial = ?", clean) ?? null;
}

export function examEligibility(user: PublicUser): ExamEligibility {
  const premium = isPremium(user);
  const { done, total } = counts(user.id);
  const allComplete = total > 0 && done >= total;
  const latest = one<{ score: number; total: number }>(
    `SELECT score, total FROM final_exams
      WHERE user_id = ? AND status = 'completed'
      ORDER BY submitted_at DESC LIMIT 1`,
    user.id
  );
  const bestPercent =
    latest && latest.total > 0 ? Math.round((latest.score / latest.total) * 100) : null;

  return {
    premium,
    modulesDone: done,
    totalModules: total,
    allComplete,
    ready: premium && allComplete,
    certificate: getCertificate(user.id),
    bestPercent,
    premiumDays: premiumDaysLeft(user),
  };
}

function selectQuestions(): Array<{ id: number; module: string }> {
  const bank = all<{ id: number; module_slug: string; module: string }>(
    `SELECT q.id, q.module_slug, m.title AS module
       FROM final_exam_questions q
       JOIN modules m ON m.slug = q.module_slug
      WHERE m.is_published = 1
      ORDER BY RANDOM()`
  );

  // Round-robin across modules so every part of the curriculum is represented.
  // The bank is slightly larger than the paper, so the last round is cut short.
  const buckets = new Map<string, Array<{ id: number; module: string }>>();
  for (const row of bank) {
    const list = buckets.get(row.module_slug) ?? [];
    list.push({ id: row.id, module: row.module });
    buckets.set(row.module_slug, list);
  }

  const picked: Array<{ id: number; module: string }> = [];
  let round = 0;
  let progressed = true;
  while (picked.length < EXAM_QUESTION_COUNT && progressed) {
    progressed = false;
    for (const list of buckets.values()) {
      const item = list[round];
      if (!item) continue;
      picked.push(item);
      progressed = true;
      if (picked.length >= EXAM_QUESTION_COUNT) break;
    }
    round += 1;
  }

  // Shuffle the final paper so runs of the same module are not predictable.
  for (let i = picked.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }

  return picked;
}

function hydrate(ids: number[], source: string): ExamQuestion[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows =
    source === "final"
      ? all<HydratedRow>(
          `SELECT q.id, q.prompt, q.options, m.title AS module
             FROM final_exam_questions q
             JOIN modules m ON m.slug = q.module_slug
            WHERE q.id IN (${placeholders})`,
          ...ids
        )
      : all<HydratedRow>(
          `SELECT q.id, q.prompt, q.options, m.title AS module
             FROM quiz_questions q
             JOIN modules m ON m.id = q.module_id
            WHERE q.id IN (${placeholders})`,
          ...ids
        );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [
      {
        id: row.id,
        prompt: row.prompt,
        options: parseOptions(row.options),
        module: row.module,
      },
    ];
  });
}

export type StartExamResult = {
  attemptId: number;
  questions: ExamQuestion[];
  startedAt: number;
  durationMs: number;
  resumed: boolean;
  violations: number;
};

export function startExam(user: PublicUser): StartExamResult {
  const gate = examEligibility(user);
  if (!gate.premium) throw new Error("The final assessment is included with Premium.");
  if (!gate.allComplete) throw new Error("Complete every learning module before the final assessment.");

  const active = one<AttemptRow>(
    `SELECT * FROM final_exams
      WHERE user_id = ? AND status = 'active'
      ORDER BY started_at DESC LIMIT 1`,
    user.id
  );

  if (active && Date.now() - active.started_at < EXAM_DURATION_MS) {
    const ids = JSON.parse(active.question_ids) as number[];
    return {
      attemptId: active.id,
      questions: hydrate(ids, active.question_source),
      startedAt: active.started_at,
      durationMs: EXAM_DURATION_MS,
      resumed: true,
      violations: active.violations ?? 0,
    };
  }
  if (active) {
    run(
      "UPDATE final_exams SET status = 'expired', submitted_at = ? WHERE id = ?",
      now(),
      active.id
    );
  }

  const picked = selectQuestions();
  if (picked.length < EXAM_QUESTION_COUNT) {
    throw new Error(
      `The final assessment needs ${EXAM_QUESTION_COUNT} questions. Ask an administrator to publish the full bank.`
    );
  }
  const ids = picked.map((item) => item.id);
  const started = now();
  const result = run(
    `INSERT INTO final_exams
       (user_id, question_ids, total, status, started_at, question_source, violations)
     VALUES (?, ?, ?, 'active', ?, 'final', 0)`,
    user.id,
    JSON.stringify(ids),
    ids.length,
    started
  );

  return {
    attemptId: Number(result.lastId),
    questions: hydrate(ids, "final"),
    startedAt: started,
    durationMs: EXAM_DURATION_MS,
    resumed: false,
    violations: 0,
  };
}

export type SubmitExamResult = {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  passMark: number;
  review: ExamReview[];
  breakdown: ExamModuleScore[];
  certificate: Certificate | null;
  violations: number;
  expired?: boolean;
};

export function submitExam(
  user: PublicUser,
  attemptId: number,
  answers: Array<{ id: number; choice: number }>,
  violations = 0
): SubmitExamResult {
  const attempt = one<AttemptRow>(
    "SELECT * FROM final_exams WHERE id = ? AND user_id = ?",
    attemptId,
    user.id
  );
  if (!attempt) throw new Error("Assessment attempt not found.");
  if (attempt.status !== "active") throw new Error("This assessment attempt is already closed.");
  if (Date.now() - attempt.started_at > EXAM_DURATION_MS) {
    run(
      "UPDATE final_exams SET status = 'expired', submitted_at = ? WHERE id = ?",
      now(),
      attempt.id
    );
    throw new Error("Time is up. Start a fresh assessment attempt.");
  }

  const ids = JSON.parse(attempt.question_ids) as number[];
  const placeholders = ids.map(() => "?").join(",");
  const rows =
    attempt.question_source === "final"
      ? all<QuizRow>(
          `SELECT q.id, 0 AS module_id, q.prompt, q.options, q.correct, q.explanation,
                  m.title AS module
             FROM final_exam_questions q
             JOIN modules m ON m.slug = q.module_slug
            WHERE q.id IN (${placeholders})`,
          ...ids
        )
      : all<QuizRow>(
          `SELECT q.id, q.module_id, q.prompt, q.options, q.correct, q.explanation,
                  m.title AS module
             FROM quiz_questions q
             JOIN modules m ON m.id = q.module_id
            WHERE q.id IN (${placeholders})`,
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
  const review: ExamReview[] = [];
  const moduleScores = new Map<string, { correct: number; total: number }>();
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    const choice = chosen.has(id) ? chosen.get(id)! : null;
    const ok = choice === row.correct;
    if (ok) score += 1;
    const bucket = moduleScores.get(row.module) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (ok) bucket.correct += 1;
    moduleScores.set(row.module, bucket);
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
  const passed = percent >= EXAM_PASS_PCT;
  const reportedViolations = Math.max(
    attempt.violations ?? 0,
    Math.min(999, Math.max(0, Math.trunc(violations)))
  );

  run(
    `UPDATE final_exams
        SET score = ?, total = ?, passed = ?, answers = ?, status = 'completed',
            submitted_at = ?, violations = ?
      WHERE id = ?`,
    score,
    total,
    passed ? 1 : 0,
    JSON.stringify(answers),
    now(),
    reportedViolations,
    attempt.id
  );

  const certificate = passed ? issueCertificate(user, attempt.id, percent) : null;

  return {
    score,
    total,
    percent,
    passed,
    passMark: EXAM_PASS_PCT,
    review,
    breakdown: Array.from(moduleScores.entries()).map(([module, value]) => ({
      module,
      correct: value.correct,
      total: value.total,
    })),
    certificate,
    violations: reportedViolations,
  };
}

function newSerial(): string {
  const year = new Date().getUTCFullYear();
  for (let i = 0; i < 6; i += 1) {
    const serial = `MTM-${year}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const clash = one<{ id: number }>("SELECT id FROM certificates WHERE serial = ?", serial);
    if (!clash) return serial;
  }
  return `MTM-${year}-${Date.now().toString(36).toUpperCase()}`;
}

function issueCertificate(user: PublicUser, examId: number, percent: number): Certificate {
  const name = (user.verified_name?.trim() || user.name).trim();
  const { done, total } = counts(user.id);
  const modules = total > 0 ? done : 0;
  const existing = one<Certificate>("SELECT * FROM certificates WHERE user_id = ?", user.id);

  if (existing) {
    run(
      `UPDATE certificates
          SET name = ?, score = ?, modules = ?, final_exam_id = ?, issued_at = ?, revoked = 0
        WHERE user_id = ?`,
      name,
      percent,
      modules,
      examId,
      now(),
      user.id
    );
  } else {
    run(
      `INSERT INTO certificates (serial, user_id, name, score, modules, final_exam_id, issued_at, revoked)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      newSerial(),
      user.id,
      name,
      percent,
      modules,
      examId,
      now()
    );
  }

  const certificate = getCertificate(user.id)!;
  run(
    "INSERT INTO activity (user_id, type, text, created_at) VALUES (?, 'certificate', ?, ?)",
    user.id,
    `Completion Merit Certificate issued · ${certificate.serial} · ${percent}%`,
    now()
  );
  return certificate;
}
