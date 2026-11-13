"use client";

import { useState } from "react";
import {
  CalendarClock, Check, Clock, ExternalLink, Loader2, Radio, Users, Video, X,
} from "lucide-react";
import { Badge, Card, cn } from "./ui";

export type SessionItem = {
  id: number;
  title: string;
  speaker: string;
  speaker_bio: string | null;
  starts_at: number;
  duration_mins: number;
  join_url: string | null;
  attending: boolean;
  attendees: number;
  live: boolean;
  dateLabel: string;
};

export function SessionsView({ sessions }: { sessions: SessionItem[] }) {
  const [items, setItems] = useState(sessions);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function toggle(id: number, attending: boolean) {
    setBusy(id);
    setError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: attending ? "cancel" : "rsvp", sessionId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The RSVP could not be saved.");
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, attending: data.attending, attendees: data.attendees }
            : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "The RSVP could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5 space-y-3">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[rgba(255,143,163,.25)] bg-[rgba(255,143,163,.06)] px-3 py-2 text-[10.5px] text-[#ffb3c0]">
          <X size={12} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {items.map((session) => (
        <Card key={session.id} className={cn("overflow-hidden", session.live && "border-[rgba(47,227,160,.28)]")}>
          <div className="relative p-5 sm:p-6">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(139,123,255,.12), transparent 65%)" }}
            />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {session.live ? (
                    <Badge tone="green"><Radio size={9} /> Live now</Badge>
                  ) : (
                    <Badge tone="violet"><CalendarClock size={9} /> Upcoming</Badge>
                  )}
                  <span className="text-[10px] text-muted">{session.attendees} attending</span>
                </div>
                <h2 className="mt-2 text-[19px] font-semibold leading-snug tracking-[-0.02em]">
                  {session.title}
                </h2>
                <div className="mt-1 text-[11.5px] text-muted">
                  with <span className="font-semibold text-ink">{session.speaker}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold">{session.dateLabel}</div>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted">
                  <Clock size={10} /> {session.duration_mins} minutes
                </div>
              </div>
            </div>

            {session.speaker_bio && (
              <p className="relative mt-3 max-w-2xl text-[11px] leading-relaxed text-[#c9d2e2]">
                {session.speaker_bio}
              </p>
            )}

            <div className="relative mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggle(session.id, session.attending)}
                disabled={busy === session.id}
                className={cn("btn btn-sm", session.attending ? "btn-dark" : "btn-primary")}
              >
                {busy === session.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : session.attending ? (
                  <Check size={13} />
                ) : (
                  <Users size={13} />
                )}
                {session.attending ? "You are attending · Cancel RSVP" : "RSVP"}
              </button>

              {session.attending && session.join_url && (
                <a
                  href={session.join_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-dark btn-sm"
                >
                  <Video size={13} /> Join session <ExternalLink size={11} />
                </a>
              )}
            </div>

            {session.attending && !session.join_url && (
              <p className="relative mt-3 text-[10px] text-muted">
                You are on the list. Joining details will appear here once the host publishes the link.
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
