"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Video, X } from "lucide-react";
import { Badge, Card, SectionHead, cn } from "./ui";

export type AdminSessionItem = {
  id: number;
  title: string;
  speaker: string;
  starts_at: number;
  duration_mins: number;
  status: string;
  attendees: number;
  dateLabel: string;
};

function defaultStart() {
  const date = new Date(Date.now() + 7 * 86_400_000);
  date.setMinutes(0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}

export function SessionsAdmin({ sessions }: { sessions: AdminSessionItem[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [bio, setBio] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [durationMins, setDurationMins] = useState(60);
  const [joinUrl, setJoinUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy("create");
    setError("");
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: title.trim(),
          speaker: speaker.trim(),
          bio: bio.trim() || undefined,
          startsAt: new Date(startsAt).toISOString(),
          durationMins,
          joinUrl: joinUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The session could not be scheduled.");
      setTitle("");
      setSpeaker("");
      setBio("");
      setJoinUrl("");
      setStartsAt(defaultStart());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The session could not be scheduled.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel(id: number) {
    if (!window.confirm("Cancel this session? Learners will still see it marked as cancelled.")) return;
    setBusy(`cancel:${id}`);
    setError("");
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel", id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The session could not be cancelled.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The session could not be cancelled.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-4 sm:p-5">
        <SectionHead
          title="Expert sessions"
          subtitle="Schedule the monthly Premium group session. Nothing is shown to learners until a real speaker and date are entered."
        />
        <Badge tone="violet">
          <Video size={9} /> {sessions.filter((s) => s.status === "scheduled").length} scheduled
        </Badge>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={140}
            placeholder="Session title"
            className="input sm:col-span-2"
            aria-label="Session title"
          />
          <input
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            placeholder="Speaker name"
            className="input"
            aria-label="Speaker name"
          />
          <input
            value={joinUrl}
            onChange={(e) => setJoinUrl(e.target.value)}
            type="url"
            placeholder="Join link (optional until confirmed)"
            className="input"
            aria-label="Join link"
          />
          <input
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            type="datetime-local"
            required
            className="input"
            aria-label="Start date and time"
          />
          <select
            value={durationMins}
            onChange={(e) => setDurationMins(Number(e.target.value))}
            className="input"
            aria-label="Duration"
          >
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>120 minutes</option>
          </select>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="Short speaker bio (optional, only facts you can stand behind)"
            className="input sm:col-span-2"
            aria-label="Speaker bio"
          />
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" disabled={Boolean(busy)} className="btn btn-primary btn-sm">
              {busy === "create" ? <Loader2 size={13} className="animate-spin" /> : <CalendarPlus size={13} />}
              Schedule session
            </button>
            <span className="text-[9.5px] text-muted">
              Times are entered in your local zone and shown to learners in UTC.
            </span>
          </div>
        </form>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-[rgba(255,143,163,.25)] bg-[rgba(255,143,163,.06)] px-3 py-2 text-[10.5px] text-[#ffb3c0]">
            <X size={12} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-2">
          {sessions.length === 0 && (
            <p className="rounded-lg border border-dashed border-white/[0.08] px-4 py-6 text-center text-[11px] text-muted">
              No expert session has been scheduled yet.
            </p>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "flex flex-wrap items-start justify-between gap-3 rounded-xl border px-3.5 py-3",
                session.status === "scheduled"
                  ? "border-white/[0.07] bg-white/[0.015]"
                  : "border-white/[0.05] bg-white/[0.01] opacity-70"
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold">{session.title}</span>
                  <Badge tone={session.status === "scheduled" ? "green" : "neutral"}>
                    {session.status}
                  </Badge>
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted">
                  {session.speaker} · {session.dateLabel} · {session.attendees} attending
                </div>
              </div>
              {session.status === "scheduled" && (
                <button
                  type="button"
                  onClick={() => cancel(session.id)}
                  disabled={Boolean(busy)}
                  className="btn btn-dark btn-sm shrink-0"
                >
                  {busy === `cancel:${session.id}` ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <X size={12} />
                  )}
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
