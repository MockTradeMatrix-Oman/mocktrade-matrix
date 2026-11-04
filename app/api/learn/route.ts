import { NextResponse } from "next/server";
import { z } from "zod";
import { all, one, run, now, tx, type Module } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { creditsForUser, notify } from "@/lib/trading";
import { emitToUser } from "@/lib/realtime";

const schema = z.object({
  action: z.enum(["quiz", "unlock"]),
  moduleId: z.number().int().positive(),
  answers: z.array(z.number().int()).optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const mod = one<Module>("SELECT * FROM modules WHERE id = ?", parsed.data.moduleId);
  if (!mod) return NextResponse.json({ error: "Module not found." }, { status: 404 });

  const progress = one<{ status: string; score: number }>(
    "SELECT status, score FROM module_progress WHERE user_id = ? AND module_id = ?",
    user.id, mod.id
  );
  const status = progress?.status ?? "locked";

  if (parsed.data.action === "unlock") {
    if (status !== "locked") return NextResponse.json({ ok: true, status });
    if (mod.is_free) {
      run("INSERT INTO module_progress (user_id,module_id,status,score) VALUES (?,?,'unlocked',0) ON CONFLICT(user_id,module_id) DO UPDATE SET status='unlocked'", user.id, mod.id);
      return NextResponse.json({ ok: true, status: "unlocked", credits: user.credits });
    }
    if (user.credits < mod.unlock_cost) {
      return NextResponse.json({ error: `This module costs ${mod.unlock_cost} credits. You have ${user.credits}.` }, { status: 400 });
    }
    tx(() => {
      run("UPDATE users SET credits = credits - ? WHERE id = ?", mod.unlock_cost, user.id);
      run("INSERT INTO transactions (user_id,kind,amount,bucket,note,created_at) VALUES (?,?,?,?,?,?)",
        user.id, "credit_spend", -mod.unlock_cost, "credits", `Unlocked ${mod.title}`, now());
      run("INSERT INTO module_progress (user_id,module_id,status,score) VALUES (?,?,'unlocked',0) ON CONFLICT(user_id,module_id) DO UPDATE SET status='unlocked'", user.id, mod.id);
    });
    emitToUser(user.id, "credits:update", { credits: user.credits - mod.unlock_cost, delta: -mod.unlock_cost, note: `Unlocked ${mod.title}` });
    return NextResponse.json({ ok: true, status: "unlocked", credits: user.credits - mod.unlock_cost });
  }

  if (status === "locked") {
    return NextResponse.json({ error: "This module is still locked." }, { status: 403 });
  }

  const questions = all<{ id: number; correct: number; explanation: string; options: string }>(
    "SELECT id, correct, explanation, options FROM quiz_questions WHERE module_id = ? ORDER BY id",
    mod.id
  );
  const answers = parsed.data.answers ?? [];
  if (answers.length !== questions.length) {
    return NextResponse.json({ error: "Answer every question before submitting." }, { status: 400 });
  }

  const details = questions.map((q, i) => ({
    correct: answers[i] === q.correct,
    answer: q.correct,
    explanation: q.explanation,
  }));
  const score = details.filter((d) => d.correct).length;
  const total = questions.length;
  const passed = score >= Math.ceil(total * 0.66);
  const priorPass = one<{ id: number }>(
    "SELECT id FROM quiz_attempts WHERE user_id = ? AND module_id = ? AND score >= ? LIMIT 1",
    user.id, mod.id, Math.ceil(total * 0.66)
  );
  const firstPass = passed && !priorPass;
  const credits = firstPass
    ? score === total ? mod.reward_credits : Math.round(mod.reward_credits * 0.6)
    : 0;

  let nextSlug: string | null = null;
  let totalCredits = user.credits;

  tx(() => {
    run(
      "INSERT INTO quiz_attempts (user_id,module_id,score,total,credits,created_at) VALUES (?,?,?,?,?,?)",
      user.id, mod.id, score, total, credits, now()
    );
    if (passed) {
      run("UPDATE module_progress SET status = 'completed', score = ?, completed_at = ? WHERE user_id = ? AND module_id = ?",
        Math.round((score / total) * 100), now(), user.id, mod.id);
      run("UPDATE users SET xp = xp + ? WHERE id = ?", score * 25 + (firstPass ? 40 : 5), user.id);
      const next = one<Module>("SELECT * FROM modules WHERE order_index = ?", mod.order_index + 1);
      if (next) {
        nextSlug = next.slug;
        const np = one<{ status: string }>(
          "SELECT status FROM module_progress WHERE user_id = ? AND module_id = ?", user.id, next.id
        );
        if (!np || np.status === "locked") {
          run("UPDATE module_progress SET status = 'unlocked' WHERE user_id = ? AND module_id = ?", user.id, next.id);
        }
      }
    } else {
      run("UPDATE module_progress SET status = 'unlocked' WHERE user_id = ? AND module_id = ?", user.id, mod.id);
    }
  });

  if (credits > 0) {
    totalCredits = creditsForUser(user.id, credits, `Quiz reward · ${mod.title}`);
    notify(user.id, "reward", `+${credits} credits earned`, `${mod.title} quiz passed with ${score}/${total}.`);
  } else if (firstPass) {
    notify(user.id, "success", "Module complete", `${mod.title} cleared with ${score}/${total}.`);
  }

  emitToUser(user.id, "learn:update", { moduleId: mod.id, score, total, passed, credits });
  if (passed) {
    run("INSERT INTO activity (user_id,type,text,created_at) VALUES (?,?,?,?)",
      user.id, "learn", `${user.name} completed ${mod.title}`, now());
  }

  return NextResponse.json({
    ok: true, score, total, passed, credits, firstPass,
    details, nextSlug, totalCredits,
  });
}
