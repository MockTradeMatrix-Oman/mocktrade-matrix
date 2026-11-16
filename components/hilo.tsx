import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HiloCard, HiloMood } from "@/lib/fun/hilo";
import { cn } from "@/lib/cn";
import { Card } from "./ui";

const MOOD_STYLE: Record<HiloMood, { ring: string; glow: string; body: string; label: string }> = {
  happy: { ring: "#2fe3a0", glow: "rgba(47,227,160,.22)", body: "#1f8f6a", label: "Cheerful" },
  hyped: { ring: "#ffc061", glow: "rgba(255,192,97,.24)", body: "#a86a1f", label: "Excited" },
  focused: { ring: "#7fdcff", glow: "rgba(76,201,240,.22)", body: "#1f6f8f", label: "Focused" },
  proud: { ring: "#b3a8ff", glow: "rgba(139,123,255,.24)", body: "#5b4bb8", label: "Proud" },
  sleepy: { ring: "#8fa6c4", glow: "rgba(143,166,196,.18)", body: "#3d4f66", label: "Sleepy" },
  concerned: { ring: "#ff8fa3", glow: "rgba(255,93,122,.18)", body: "#8f3446", label: "Concerned" },
};

export function HiloFace({
  mood = "happy",
  size = 64,
  bob = true,
  className,
}: {
  mood?: HiloMood;
  size?: number;
  bob?: boolean;
  className?: string;
}) {
  const style = MOOD_STYLE[mood];
  const eyeY = mood === "sleepy" ? 27 : 26;
  return (
    <div
      className={cn("relative shrink-0", bob && "hilo-bob", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, ${style.glow}, transparent 70%)` }}
      />
      <svg viewBox="0 0 64 64" width={size} height={size} className="relative">
        <defs>
          <linearGradient id={`hilo-body-${mood}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={style.body} stopOpacity="0.98" />
            <stop offset="100%" stopColor="#0b1220" stopOpacity="0.98" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="34" r="23" fill={`url(#hilo-body-${mood})`} stroke={style.ring} strokeWidth="1.4" />
        <path d="M32 10 L32 4" stroke={style.ring} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="32" cy="3.4" r="2.1" fill={style.ring} />
        <path d="M9 36 Q4 41 8 45" stroke={style.ring} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M55 36 Q60 41 56 45" stroke={style.ring} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="23.5" cy={eyeY} rx="4.1" ry="4.6" fill="#f4fbff" />
        <ellipse cx="40.5" cy={eyeY} rx="4.1" ry="4.6" fill="#f4fbff" />
        <circle cx="24.4" cy={eyeY + 0.6} r="1.9" fill="#0b1220" />
        <circle cx="41.4" cy={eyeY + 0.6} r="1.9" fill="#0b1220" />
        <circle cx="25.2" cy={eyeY - 0.4} r="0.6" fill="#fff" />
        <circle cx="42.2" cy={eyeY - 0.4} r="0.6" fill="#fff" />
        {mood === "happy" && (
          <path d="M24 40 Q32 47 40 40" stroke="#dffcf1" strokeWidth="1.9" fill="none" strokeLinecap="round" />
        )}
        {mood === "hyped" && (
          <>
            <path d="M23 39 Q32 52 41 39 Z" fill="#dffcf1" />
            <path d="M26 41 Q32 45 38 41" stroke="#9fe7c9" strokeWidth="1.2" fill="none" />
          </>
        )}
        {mood === "focused" && (
          <path d="M25 42 L39 42" stroke="#dffcf1" strokeWidth="1.9" strokeLinecap="round" />
        )}
        {mood === "proud" && (
          <>
            <path d="M25 41 Q32 46 39 41" stroke="#efeaff" strokeWidth="1.9" fill="none" strokeLinecap="round" />
            <path d="M48 18 L50 22 L54 24 L50 26 L48 30 L46 26 L42 24 L46 22 Z" fill="#efeaff" opacity=".9" />
          </>
        )}
        {mood === "sleepy" && (
          <>
            <path d="M19 26 Q23.5 30 28 26" stroke="#e6eefb" strokeWidth="1.7" fill="none" strokeLinecap="round" />
            <path d="M36 26 Q40.5 30 45 26" stroke="#e6eefb" strokeWidth="1.7" fill="none" strokeLinecap="round" />
            <ellipse cx="32" cy="42" rx="2.6" ry="2" fill="#e6eefb" opacity=".85" />
            <text x="48" y="16" fill="#cfe0f6" fontSize="9" fontWeight="700">z</text>
            <text x="53" y="10" fill="#cfe0f6" fontSize="7" fontWeight="700">z</text>
          </>
        )}
        {mood === "concerned" && (
          <>
            <path d="M25 43 Q32 38 39 43" stroke="#ffe3e8" strokeWidth="1.9" fill="none" strokeLinecap="round" />
            <path d="M18 18 L27 21" stroke="#ffe3e8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M46 18 L37 21" stroke="#ffe3e8" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
}

export function HiloCardView({ card, className }: { card: HiloCard; className?: string }) {
  const mood = MOOD_STYLE[card.mood];
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="relative p-4 sm:p-5">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full"
          style={{ background: `radial-gradient(circle, ${mood.glow}, transparent 65%)` }}
        />
        <div className="relative flex items-start gap-3.5">
          <HiloFace mood={card.mood} size={62} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">HiLo</span>
              <span className="chip" style={{ borderColor: `${mood.ring}33`, color: mood.ring }}>
                {mood.label}
              </span>
            </div>
            <div className="mt-1 text-[14.5px] font-semibold leading-snug tracking-tight">{card.headline}</div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{card.message}</p>
          </div>
        </div>

        {card.chips.length > 0 && (
          <div className="relative mt-3 flex flex-wrap gap-1.5">
            {card.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[9.5px] font-medium text-muted"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        <div className="relative mt-3.5 flex items-start gap-2 rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2.5">
          <span className="mt-0.5 text-[13px]" aria-hidden="true">✦</span>
          <p className="text-[11px] leading-relaxed text-[#c9d2e2]">
            <span className="font-semibold" style={{ color: mood.ring }}>HiLo tip · </span>
            {card.tip}
          </p>
        </div>

        {card.cta && (
          <div className="relative mt-3">
            <Link href={card.cta.href} className="btn btn-primary btn-sm">
              {card.cta.label} <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
