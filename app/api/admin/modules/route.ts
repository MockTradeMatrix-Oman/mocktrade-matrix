import { NextResponse } from "next/server";
import { z } from "zod";
import { all, one, run, tx, type Module } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const questionSchema = z.object({
  prompt: z.string().trim().min(4).max(500),
  options: z.array(z.string().trim().min(1).max(300)).min(2).max(5),
  correct: z.number().int().min(0),
  explanation: z.string().trim().max(800).default(""),
});

const moduleSchema = z.object({
  title: z.string().trim().min(3).max(120),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes."),
  subtitle: z.string().trim().max(160).default(""),
  description: z.string().trim().max(600).default(""),
  level: z.enum(["Foundation", "Intermediate", "Advanced"]),
  order_index: z.number().int().min(1).max(999),
  minutes: z.number().int().min(1).max(600),
  reward_credits: z.number().int().min(0).max(10_000),
  unlock_cost: z.number().int().min(0).max(10_000),
  video_seconds: z.number().int().min(0).max(36_000).default(300),
  video_url: z.string().trim().max(500).optional().default(""),
  content: z.string().trim().min(20).max(20_000),
  is_free: z.boolean().default(false),
  is_published: z.boolean().default(true),
  questions: z.array(questionSchema).min(1).max(20),
});

function normalise(input: z.infer<typeof moduleSchema>) {
  return {
    ...input,
    video_url: input.video_url ? input.video_url : null,
    is_free: input.is_free ? 1 : 0,
    is_published: input.is_published ? 1 : 0,
  };
}

function validateQuestions(questions: z.infer<typeof questionSchema>[]) {
  for (const [i, q] of questions.entries()) {
    if (q.correct >= q.options.length) {
      return `Question ${i + 1}: the correct answer must point at one of the options.`;
    }
  }
  return null;
}

function ensureProgressFor(moduleId: number) {
  run(
    `INSERT OR IGNORE INTO module_progress (user_id,module_id,status,score,completed_at)
     SELECT id, ?, 'locked', 0, NULL FROM users`,
    moduleId
  );
}

export async function POST(req: Request) {
  await requireAdmin();
  const parsed = moduleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid module." }, { status: 400 });
  }
  const data = normalise(parsed.data);
  const questionError = validateQuestions(parsed.data.questions);
  if (questionError) return NextResponse.json({ error: questionError }, { status: 400 });

  if (one<{ id: number }>("SELECT id FROM modules WHERE slug = ?", data.slug)) {
    return NextResponse.json({ error: "That slug is already used by another module." }, { status: 409 });
  }

  const id = tx(() => {
    const res = run(
      `INSERT INTO modules
        (slug,title,subtitle,description,level,order_index,minutes,reward_credits,unlock_cost,
         video_seconds,video_url,content,is_free,is_published)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      data.slug, data.title, data.subtitle, data.description, data.level, data.order_index,
      data.minutes, data.reward_credits, data.unlock_cost, data.video_seconds, data.video_url,
      data.content, data.is_free, data.is_published
    );
    for (const q of parsed.data.questions) {
      run(
        "INSERT INTO quiz_questions (module_id,prompt,options,correct,explanation) VALUES (?,?,?,?,?)",
        res.lastId, q.prompt, JSON.stringify(q.options), q.correct, q.explanation
      );
    }
    if (data.is_published) ensureProgressFor(res.lastId);
    return res.lastId;
  });

  return NextResponse.json({ ok: true, id, slug: data.slug });
}

export async function PATCH(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const id = Number((body as any)?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "A valid module id is required." }, { status: 400 });
  }
  const parsed = moduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid module." }, { status: 400 });
  }
  const existing = one<Module>("SELECT * FROM modules WHERE id = ?", id);
  if (!existing) return NextResponse.json({ error: "Module not found." }, { status: 404 });

  const data = normalise(parsed.data);
  const questionError = validateQuestions(parsed.data.questions);
  if (questionError) return NextResponse.json({ error: questionError }, { status: 400 });

  const clash = one<{ id: number }>("SELECT id FROM modules WHERE slug = ? AND id <> ?", data.slug, id);
  if (clash) return NextResponse.json({ error: "That slug is already used by another module." }, { status: 409 });

  tx(() => {
    run(
      `UPDATE modules SET
         slug = ?, title = ?, subtitle = ?, description = ?, level = ?, order_index = ?,
         minutes = ?, reward_credits = ?, unlock_cost = ?, video_seconds = ?, video_url = ?,
         content = ?, is_free = ?, is_published = ?
       WHERE id = ?`,
      data.slug, data.title, data.subtitle, data.description, data.level, data.order_index,
      data.minutes, data.reward_credits, data.unlock_cost, data.video_seconds, data.video_url,
      data.content, data.is_free, data.is_published, id
    );
    run("DELETE FROM quiz_questions WHERE module_id = ?", id);
    for (const q of parsed.data.questions) {
      run(
        "INSERT INTO quiz_questions (module_id,prompt,options,correct,explanation) VALUES (?,?,?,?,?)",
        id, q.prompt, JSON.stringify(q.options), q.correct, q.explanation
      );
    }
    if (data.is_published) ensureProgressFor(id);
  });

  return NextResponse.json({ ok: true, id, slug: data.slug });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "A valid module id is required." }, { status: 400 });
  }
  const existing = one<{ id: number }>("SELECT id FROM modules WHERE id = ?", id);
  if (!existing) return NextResponse.json({ error: "Module not found." }, { status: 404 });

  const published = all<{ id: number }>("SELECT id FROM modules WHERE is_published = 1 AND id <> ?", id);
  if (published.length === 0) {
    return NextResponse.json({ error: "Keep at least one published module so learners have somewhere to start." }, { status: 409 });
  }

  tx(() => {
    run("DELETE FROM quiz_questions WHERE module_id = ?", id);
    run("DELETE FROM module_progress WHERE module_id = ?", id);
    run("DELETE FROM quiz_attempts WHERE module_id = ?", id);
    run("DELETE FROM modules WHERE id = ?", id);
  });

  return NextResponse.json({ ok: true });
}
