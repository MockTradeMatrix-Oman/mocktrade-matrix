import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { all, one, type Module } from "@/lib/db";
import { AdminModuleEditor } from "@/components/admin-module-editor";
import type { EditorModule } from "@/lib/editor-module";

export const dynamic = "force-dynamic";

type QuestionRow = {
  prompt: string;
  options: string;
  correct: number;
  explanation: string;
};

export default async function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const moduleId = Number(id);
  if (!Number.isInteger(moduleId) || moduleId <= 0) notFound();

  const mod = one<Module>("SELECT * FROM modules WHERE id = ?", moduleId);
  if (!mod) notFound();

  const questions = all<QuestionRow>(
    "SELECT prompt, options, correct, explanation FROM quiz_questions WHERE module_id = ? ORDER BY id",
    moduleId
  ).map((q) => {
    let options: string[] = [];
    try {
      options = JSON.parse(q.options) as string[];
    } catch {
      options = [q.options];
    }
    return {
      prompt: q.prompt,
      options: options.length >= 2 ? options : [...options, ""],
      correct: Math.max(0, Math.min(q.correct, Math.max(0, options.length - 1))),
      explanation: q.explanation ?? "",
    };
  });

  const initial: EditorModule = {
    id: mod.id,
    title: mod.title,
    slug: mod.slug,
    subtitle: mod.subtitle,
    description: mod.description,
    level: mod.level,
    order_index: mod.order_index,
    minutes: mod.minutes,
    reward_credits: mod.reward_credits,
    unlock_cost: mod.unlock_cost,
    video_seconds: mod.video_seconds,
    video_url: mod.video_url ?? "",
    content: mod.content,
    is_free: Boolean(mod.is_free),
    is_published: Boolean(mod.is_published),
    questions: questions.length > 0
      ? questions
      : [{ prompt: "", options: ["", "", "", ""], correct: 0, explanation: "" }],
  };

  return <AdminModuleEditor initial={initial} />;
}
