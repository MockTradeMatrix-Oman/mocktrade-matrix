"use client";

import { useMemo, useState } from "react";
import { Play, Video } from "lucide-react";
import { cn } from "./ui";

function embedFor(url: string): { kind: "iframe" | "video"; src: string } | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const yt =
    trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i)?.[1];
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt}` };

  const vimeo = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i)?.[1];
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo}` };

  if (/^https?:\/\//i.test(trimmed) && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)) {
    return { kind: "video", src: trimmed };
  }

  if (/^https?:\/\//i.test(trimmed)) return { kind: "iframe", src: trimmed };
  return null;
}

export function ModuleVideo({
  url,
  title,
  minutes,
}: {
  url: string | null;
  title: string;
  minutes: number;
}) {
  const embed = useMemo(() => (url ? embedFor(url) : null), [url]);
  const [started, setStarted] = useState(false);

  if (!embed) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#060a11]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          <Video size={11} className="text-[#b3a8ff]" /> Video lesson
        </div>
        <span className="text-[9.5px] text-muted/70">≈ {Math.max(1, Math.round(minutes / 2))} min watch</span>
      </div>

      <div className="relative aspect-video w-full bg-black">
        {!started && embed.kind === "iframe" ? (
          <button
            onClick={() => setStarted(true)}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-3"
            aria-label={`Play ${title}`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-40"
              style={{ background: "radial-gradient(60% 60% at 50% 45%, rgba(139,123,255,.25), transparent 70%)" }} />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] backdrop-blur transition group-hover:scale-105 group-hover:border-[rgba(47,227,160,.45)] group-hover:bg-[rgba(47,227,160,.12)]">
              <Play size={22} className="ml-0.5 text-white" fill="currentColor" />
            </span>
            <span className="relative max-w-[80%] text-center text-[11px] font-medium text-white/70">
              {title}
            </span>
          </button>
        ) : embed.kind === "video" ? (
          <video
            src={embed.src}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <iframe
            src={`${embed.src}${embed.src.includes("?") ? "&" : "?"}autoplay=1&rel=0`}
            title={`${title} — video lesson`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className={cn("absolute inset-0 h-full w-full border-0")}
          />
        )}
      </div>
    </div>
  );
}
