"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeft, BookOpen, Check, ChevronDown, Plus, Save,
  Sparkles, Trash2, Video, X, Zap,
} from "lucide-react";
import { Badge, Card, Modal, SectionHead, Toggle, cn } from "./ui";
import { ModuleVideo } from "./module-video";
import { useToast } from "./toast";
import {
  LEVELS, blankQuestion, normalizeEditorModule, slugify,
  type EditorModule, type EditorQuestion,
} from "@/lib/editor-module";

export type { EditorModule, EditorQuestion };
export { BLANK_MODULE, blankModule, slugify } from "@/lib/editor-module";

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted/70">{hint}</p>}
    </div>
  );
}

export function AdminModuleEditor({ initial: rawInitial }: { initial: EditorModule }) {
  const initial = useMemo(() => normalizeEditorModule(rawInitial), [rawInitial]);
  const router = useRouter();
  const { push } = useToast();
  const editing = Boolean(initial.id);

  const [form, setForm] = useState<EditorModule>(initial);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const initialJson = useRef(JSON.stringify(initial));

  const dirty = useMemo(() => JSON.stringify(form) !== initialJson.current, [form]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function set<K extends keyof EditorModule>(key: K, value: EditorModule[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  }

  function updateQuestion(index: number, patch: Partial<EditorQuestion>) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }));
  }

  function setOption(qIndex: number, oIndex: number, value: string) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q
      ),
    }));
  }

  function addOption(qIndex: number) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === qIndex && q.options.length < 5 ? { ...q, options: [...q.options, ""] } : q
      ),
    }));
  }

  function removeOption(qIndex: number, oIndex: number) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qIndex || q.options.length <= 2) return q;
        const options = q.options.filter((_, j) => j !== oIndex);
        const correct = q.correct === oIndex ? 0 : q.correct > oIndex ? q.correct - 1 : q.correct;
        return { ...q, options, correct: Math.min(correct, options.length - 1) };
      }),
    }));
  }

  function addQuestion() {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, blankQuestion()],
    }));
  }

  function removeQuestion(index: number) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.length <= 1 ? prev.questions : prev.questions.filter((_, i) => i !== index),
    }));
  }

  function validate(): string | null {
    if (form.title.trim().length < 3) return "Give the module a title of at least 3 characters.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) return "The slug must use lowercase letters, numbers and dashes.";
    if (form.content.trim().length < 20) return "The lesson needs at least a short paragraph of content.";
    if (form.questions.length === 0) return "Add at least one quiz question.";
    for (const [i, q] of form.questions.entries()) {
      if (q.prompt.trim().length < 4) return `Question ${i + 1} needs a prompt.`;
      if (q.options.some((o) => !o.trim())) return `Question ${i + 1} has an empty answer option.`;
      if (q.correct < 0 || q.correct >= q.options.length) return `Question ${i + 1} needs a correct answer selected.`;
    }
    return null;
  }

  async function save() {
    const error = validate();
    if (error) {
      push({ tone: "error", title: "Check the form", body: error });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...(editing ? { id: initial.id } : {}),
        title: form.title.trim(),
        slug: form.slug.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        level: form.level,
        order_index: Number(form.order_index) || 1,
        minutes: Number(form.minutes) || 1,
        reward_credits: Number(form.reward_credits) || 0,
        unlock_cost: Number(form.unlock_cost) || 0,
        video_seconds: Number(form.video_seconds) || 0,
        video_url: form.video_url.trim(),
        content: form.content.trim(),
        is_free: form.is_free,
        is_published: form.is_published,
        questions: form.questions.map((q) => ({
          prompt: q.prompt.trim(),
          options: q.options.map((o) => o.trim()),
          correct: q.correct,
          explanation: q.explanation.trim(),
        })),
      };
      const res = await fetch("/api/admin/modules", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the module.");
      push({
        tone: "success",
        title: editing ? "Module updated" : "Module created",
        body: form.is_published ? "It is live on the learning ladder." : "Saved as a draft — students cannot see it yet.",
      });
      initialJson.current = JSON.stringify(form);
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Save failed", body: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/modules?id=${initial.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete the module.");
      push({ tone: "success", title: "Module deleted", body: `${form.title} was removed from the curriculum.` });
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Delete failed", body: err.message });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const answered = form.questions.length;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="flex items-center gap-1 text-[10px] text-muted hover:text-ink">
            <ArrowLeft size={11} /> Curriculum studio
          </Link>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight sm:text-[26px]">
            {editing ? "Edit module" : "New module"}
          </h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
            {editing
              ? "Changes apply immediately for students. Editing does not reset progress or past scores."
              : "Build a lesson, attach an optional video and add a quiz. Save as a draft until it is ready."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge tone="amber"><span className="h-1.5 w-1.5 rounded-full bg-[#ffc061]" /> Unsaved</Badge>}
          {form.is_published ? <Badge tone="green">Live</Badge> : <Badge tone="amber">Draft</Badge>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <SectionHead title="Module details" subtitle="How it appears on the learning ladder" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Title" className="sm:col-span-2">
                <input className="input" value={form.title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reading a Balance Sheet" maxLength={120} />
              </Field>
              <Field label="Slug" hint="Used in the URL: /learn/your-slug">
                <input
                  className="input"
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }}
                  placeholder="reading-a-balance-sheet"
                  maxLength={120}
                />
              </Field>
              <Field label="Level">
                <div className="relative">
                  <select className="input appearance-none pr-8" value={form.level} onChange={(e) => set("level", e.target.value)}>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                </div>
              </Field>
              <Field label="Subtitle" className="sm:col-span-2">
                <input className="input" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="One line that tells students what they will learn" maxLength={160} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea className="input min-h-[70px] resize-y" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short summary shown above the lesson." maxLength={600} />
              </Field>
              <Field label="Order in ladder" hint="Modules are shown in this order.">
                <input type="number" min={1} max={999} className="input num" value={form.order_index} onChange={(e) => set("order_index", Number(e.target.value))} />
              </Field>
              <Field label="Read time (minutes)">
                <input type="number" min={1} max={600} className="input num" value={form.minutes} onChange={(e) => set("minutes", Number(e.target.value))} />
              </Field>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionHead title="Lesson content" subtitle="Plain text. Separate paragraphs with a blank line, start bullets with •" />
            <textarea
              className="input mt-4 min-h-[220px] resize-y font-mono text-[11.5px] leading-relaxed"
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder={"A price is not a value. It is the last thing two people agreed on.\n\n• Demand moves faster than supply\n• Liquidity decides how much you lose on the way out"}
            />
            <p className="mt-2 text-[9.5px] leading-relaxed text-muted/70">
              Wrap a phrase in **double asterisks** to bold it. Keep paragraphs short — the lesson renders at reading width.
            </p>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-4 sm:p-5">
              <SectionHead title="Quiz" subtitle={`${answered} question${answered === 1 ? "" : "s"} · pass mark 66%`} />
              <button onClick={addQuestion} className="btn btn-ghost btn-sm">
                <Plus size={12} /> Add question
              </button>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              {form.questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] font-bold text-muted">
                      {qi + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <input
                        className="input"
                        value={q.prompt}
                        onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                        placeholder="What does a bid-ask spread actually pay for?"
                        maxLength={500}
                      />

                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => {
                          const correct = q.correct === oi;
                          return (
                            <div key={oi} className="flex min-w-0 items-center gap-2">
                              <button
                                onClick={() => updateQuestion(qi, { correct: oi })}
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition",
                                  correct ? "border-[#2fe3a0] bg-[#2fe3a0] text-[#04140d]" : "border-white/15 text-transparent hover:border-white/30"
                                )}
                                aria-label={`Mark option ${oi + 1} correct`}
                                title="Mark as correct answer"
                              >
                                <Check size={11} strokeWidth={3} />
                              </button>
                              <input
                                className={cn("input h-9 min-w-0 flex-1", correct && "border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.04)]")}
                                value={opt}
                                onChange={(e) => setOption(qi, oi, e.target.value)}
                                placeholder={`Option ${oi + 1}`}
                                maxLength={300}
                              />
                              <button
                                onClick={() => removeOption(qi, oi)}
                                disabled={q.options.length <= 2}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted/60 transition hover:bg-white/5 hover:text-[#ff8fa3] disabled:opacity-20"
                                aria-label="Remove option"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button onClick={() => addOption(qi)} disabled={q.options.length >= 5} className="py-1.5 text-[10px] font-medium text-[#5beeb9] hover:underline disabled:opacity-30">
                          + Add option
                        </button>
                        <span className="text-[9px] text-muted/60">Tap the circle to mark the correct answer</span>
                      </div>

                      <input
                        className="input h-9"
                        value={q.explanation}
                        onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                        placeholder="Explanation shown after scoring (optional)"
                        maxLength={800}
                      />
                    </div>
                    <button
                      onClick={() => removeQuestion(qi)}
                      disabled={form.questions.length <= 1}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted/60 transition hover:bg-white/5 hover:text-[#ff8fa3] disabled:opacity-20"
                      aria-label="Remove question"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={addQuestion} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.1] py-3 text-[11px] font-medium text-muted transition hover:border-white/20 hover:text-ink">
                <Plus size={13} /> Add another question
              </button>
            </div>
          </Card>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[112px] xl:self-start">
          <Card className="p-4 sm:p-5">
            <SectionHead title="Publishing" subtitle="Control student visibility" />
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div>
                  <div className="text-[11.5px] font-semibold">Published</div>
                  <div className="mt-0.5 text-[9.5px] leading-relaxed text-muted">Visible on the learning ladder.</div>
                </div>
                <Toggle checked={form.is_published} onChange={(v) => set("is_published", v)} label="Published" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div>
                  <div className="text-[11.5px] font-semibold">Free to unlock</div>
                  <div className="mt-0.5 text-[9.5px] leading-relaxed text-muted">Skip the credit unlock cost.</div>
                </div>
                <Toggle checked={form.is_free} onChange={(v) => { set("is_free", v); if (v) set("unlock_cost", 0); }} label="Free module" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Field label="Reward">
                <div className="relative">
                  <Zap size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#ffd08d]" />
                  <input type="number" min={0} max={10000} className="input num pl-7" value={form.reward_credits} onChange={(e) => set("reward_credits", Number(e.target.value))} />
                </div>
              </Field>
              <Field label="Unlock cost">
                <input type="number" min={0} max={10000} className="input num" value={form.unlock_cost} disabled={form.is_free} onChange={(e) => set("unlock_cost", Number(e.target.value))} />
              </Field>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionHead title="Video lesson" subtitle="Optional · YouTube, Vimeo or MP4" />
            <div className="mt-4">
              <Field label="Video URL">
                <div className="relative">
                  <Video size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    className="input pl-7"
                    value={form.video_url}
                    onChange={(e) => set("video_url", e.target.value)}
                    placeholder="https://youtu.be/…"
                    maxLength={500}
                  />
                </div>
              </Field>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[9px] text-muted/70">Leave empty for a text-only lesson.</span>
                {form.video_url && (
                  <button onClick={() => setShowPreview((v) => !v)} className="text-[10px] font-medium text-[#5beeb9] hover:underline">
                    {showPreview ? "Hide preview" : "Preview"}
                  </button>
                )}
              </div>
              {showPreview && form.video_url && (
                <div className="mt-3">
                  <ModuleVideo url={form.video_url} title={form.title || "Video preview"} minutes={form.minutes} />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionHead title="Lesson preview" subtitle="What students see first" />
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-1.5">
                <Badge tone={form.level === "Advanced" ? "amber" : form.level === "Intermediate" ? "violet" : "green"}>{form.level}</Badge>
                <span className="text-[9px] text-muted">Module {form.order_index}</span>
              </div>
              <div className="mt-1.5 text-[12.5px] font-semibold leading-snug">{form.title || "Untitled module"}</div>
              <div className="mt-0.5 line-clamp-2 text-[10px] text-muted">{form.subtitle || "No subtitle yet."}</div>
              <div className="mt-2 flex items-center gap-2 text-[9px] text-muted">
                <span>{form.minutes} min</span>
                <span>·</span>
                <span>{form.questions.length} questions</span>
                <span>·</span>
                <span className="flex items-center gap-0.5 text-[#ffd08d]"><Zap size={8} /> {form.reward_credits}</span>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-1.5 text-[9px] leading-relaxed text-muted/70">
              <Sparkles size={10} className="mt-0.5 shrink-0 text-[#ffd08d]" />
              A perfect score pays the full reward. A pass pays 60%.
            </div>
          </Card>

          {editing && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[rgba(255,93,122,.2)] bg-[rgba(255,93,122,.05)] py-2.5 text-[11px] font-medium text-[#ff8fa3] transition hover:bg-[rgba(255,93,122,.1)]"
            >
              <Trash2 size={13} /> Delete module
            </button>
          )}
        </aside>
      </div>

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[#06080d]/90 px-4 py-3 backdrop-blur-xl lg:pl-[264px]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
          <div className="hidden items-center gap-2 text-[10px] text-muted sm:flex">
            <BookOpen size={12} />
            {editing ? "Editing an existing module" : "New module"}
            {dirty && <span className="text-[#ffd08d]">· unsaved changes</span>}
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <Link href="/admin" className="btn btn-ghost btn-sm">Cancel</Link>
            <button onClick={save} disabled={busy} className="btn btn-primary btn-sm">
              <Save size={13} /> {busy ? "Saving…" : editing ? "Save changes" : "Create module"}
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this module?"
        subtitle={`${form.title} and its quiz will be removed. Student progress for this module is deleted too. This cannot be undone.`}
        width={460}
      >
        <div className="p-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-[rgba(255,93,122,.22)] bg-[rgba(255,93,122,.05)] p-3.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#ff8fa3]" />
            <p className="text-[11px] leading-relaxed text-muted">
              If this is the last published module, the delete will be blocked so learners still have a starting point.
            </p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost btn-sm">Keep module</button>
            <button onClick={remove} disabled={deleting} className="btn btn-sm border border-[rgba(255,93,122,.3)] bg-[rgba(255,93,122,.12)] text-[#ffb3c0] hover:bg-[rgba(255,93,122,.18)]">
              {deleting ? "Deleting…" : <><Trash2 size={12} /> Delete permanently</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
