/**
 * Shared shapes for the admin curriculum editor.
 *
 * These live in a plain module (not a "use client" file) because server
 * components cannot spread values exported from a client module — on the
 * server those exports are client-reference proxies, not the real object.
 */

export type EditorQuestion = {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type EditorModule = {
  id?: number;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  level: string;
  order_index: number;
  minutes: number;
  reward_credits: number;
  unlock_cost: number;
  video_seconds: number;
  video_url: string;
  content: string;
  is_free: boolean;
  is_published: boolean;
  questions: EditorQuestion[];
};

export const LEVELS = ["Foundation", "Intermediate", "Advanced"] as const;

export const EMPTY_QUESTION: EditorQuestion = {
  prompt: "",
  options: ["", "", "", ""],
  correct: 0,
  explanation: "",
};

export function blankQuestion(): EditorQuestion {
  return { ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] };
}

export function blankModule(): EditorModule {
  return {
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    level: "Foundation",
    order_index: 1,
    minutes: 8,
    reward_credits: 50,
    unlock_cost: 0,
    video_seconds: 300,
    video_url: "",
    content: "",
    is_free: true,
    is_published: false,
    questions: [blankQuestion()],
  };
}

export const BLANK_MODULE: EditorModule = blankModule();

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** Repair partial/legacy data so the editor never renders undefined arrays. */
export function normalizeEditorModule(input: Partial<EditorModule>): EditorModule {
  const questions = Array.isArray(input.questions) && input.questions.length > 0
    ? input.questions.map((q) => ({
        prompt: typeof q?.prompt === "string" ? q.prompt : "",
        options: Array.isArray(q?.options) && q.options.length >= 2 ? q.options : ["", "", "", ""],
        correct: Number.isInteger(q?.correct) ? q.correct : 0,
        explanation: typeof q?.explanation === "string" ? q.explanation : "",
      }))
    : [blankQuestion()];

  const base = blankModule();
  return {
    id: input.id,
    title: input.title ?? base.title,
    slug: input.slug ?? base.slug,
    subtitle: input.subtitle ?? base.subtitle,
    description: input.description ?? base.description,
    level: input.level ?? base.level,
    order_index: Number.isFinite(input.order_index) ? Number(input.order_index) : base.order_index,
    minutes: Number.isFinite(input.minutes) ? Number(input.minutes) : base.minutes,
    reward_credits: Number.isFinite(input.reward_credits) ? Number(input.reward_credits) : base.reward_credits,
    unlock_cost: Number.isFinite(input.unlock_cost) ? Number(input.unlock_cost) : base.unlock_cost,
    video_seconds: Number.isFinite(input.video_seconds) ? Number(input.video_seconds) : base.video_seconds,
    video_url: input.video_url ?? base.video_url,
    content: input.content ?? base.content,
    is_free: input.is_free ?? base.is_free,
    is_published: input.is_published ?? base.is_published,
    questions,
  };
}
