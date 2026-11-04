"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useMarket } from "./socket";
import { fmtMoney, fmtPct, toLocal } from "@/lib/finance";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({ className, children, hover }: { className?: string; children: React.ReactNode; hover?: boolean }) {
  return <div className={cn("card", hover && "card-hover", className)}>{children}</div>;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red" | "violet" | "amber" | "cyan";
  className?: string;
}) {
  const map: Record<string, string> = {
    neutral: "",
    green: "chip-green",
    red: "chip-red",
    violet: "chip-violet",
    amber: "chip-amber",
    cyan: "!text-[#7fdcff] !bg-[rgba(76,201,240,.09)] !border-[rgba(76,201,240,.22)]",
  };
  return <span className={cn("chip", map[tone], className)}>{children}</span>;
}

export function Progress({ value, tone = "green", className }: { value: number; tone?: "green" | "violet" | "amber" | "cyan"; className?: string }) {
  const colors: Record<string, string> = {
    green: "linear-gradient(90deg,#1fc98a,#4cf0b4)",
    violet: "linear-gradient(90deg,#6f5cff,#a79bff)",
    amber: "linear-gradient(90deg,#e8a33d,#ffd08d)",
    cyan: "linear-gradient(90deg,#2aa8d8,#7fdcff)",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: colors[tone], boxShadow: "0 0 12px rgba(47,227,160,.35)" }}
      />
    </div>
  );
}

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const letters = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  const hue = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full border border-white/10 font-semibold text-white", className)}
      style={{
        width: size, height: size, fontSize: size * 0.34,
        background: `linear-gradient(145deg, hsl(${hue} 55% 38%), hsl(${(hue + 45) % 360} 60% 24%))`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)",
      }}
    >
      {letters || "MT"}
    </div>
  );
}

export function ChangePill({ value, className, showIcon = false }: { value: number; className?: string; showIcon?: boolean }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold",
        up ? "bg-[rgba(47,227,160,.1)] text-[#5beeb9]" : "bg-[rgba(255,93,122,.1)] text-[#ff8fa3]",
        className
      )}
    >
      {showIcon && <span className="text-[9px]">{up ? "▲" : "▼"}</span>}
      {fmtPct(value)}
    </span>
  );
}

export function LivePrice({
  symbol,
  fallback,
  region,
  className,
  showChange = false,
  compact = false,
  digits,
}: {
  symbol: string;
  fallback: number;
  region: string;
  className?: string;
  showChange?: boolean;
  compact?: boolean;
  digits?: number;
}) {
  const { prices } = useMarket();
  const tick = prices[symbol];
  const priceUsd = tick?.p ?? fallback;
  const local = toLocal(priceUsd, region);
  const prev = useRef(priceUsd);
  const [dir, setDir] = useState<"" | "up" | "down">("");

  useEffect(() => {
    if (priceUsd === prev.current) return;
    setDir(priceUsd > prev.current ? "up" : "down");
    prev.current = priceUsd;
    const id = setTimeout(() => setDir(""), 800);
    return () => clearTimeout(id);
  }, [priceUsd]);

  const text = digits !== undefined
    ? `${region === "IN" ? "₹" : "$"}${local.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
    : fmtMoney(local, region, compact);

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span
        className={cn("num font-semibold transition-colors duration-300", dir === "up" && "!text-[#5beeb9]", dir === "down" && "!text-[#ff8fa3]")}
        style={{ color: "inherit" }}
      >
        {text}
      </span>
      {showChange && tick && <ChangePill value={tick.chg} />}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "neutral" | "green" | "red" | "violet" | "amber";
  icon?: React.ReactNode;
  className?: string;
}) {
  const colors: Record<string, string> = {
    neutral: "text-ink", green: "text-[#5beeb9]", red: "text-[#ff8fa3]",
    violet: "text-[#b3a8ff]", amber: "text-[#ffd08d]",
  };
  return (
    <div className={cn("rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
        {icon && <span className="text-muted/70">{icon}</span>}
      </div>
      <div className={cn("num mt-2 text-[22px] font-semibold leading-none", colors[tone])}>{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-muted">{sub}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className="animate-pop relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl"
        style={{ maxWidth: width, boxShadow: "0 40px 120px -30px rgba(0,0,0,.9)" }}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-5">
            <div>
              {title && <div className="text-[16px] font-semibold tracking-tight">{title}</div>}
              {subtitle && <div className="mt-1 text-[12px] leading-relaxed text-muted">{subtitle}</div>}
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition hover:bg-white/5 hover:text-ink" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="max-h-[78vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: Array<{ id: T; label: React.ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg font-semibold transition-all",
            size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-[12px]",
            value === o.id ? "bg-white/[0.09] text-ink shadow-sm" : "text-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5"
      aria-pressed={checked}
      aria-label={label}
    >
      <span
        className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-[#20c98a]" : "bg-white/10")}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </span>
      {label && <span className="text-[12px] text-muted">{label}</span>}
    </button>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-muted">{icon}</div>}
      <div className="text-[14px] font-semibold">{title}</div>
      {body && <div className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">{body}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11.5px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AnimatedNumber({ value, prefix = "", suffix = "", digits = 0, className }: { value: number; prefix?: string; suffix?: string; digits?: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;
    if (Math.abs(delta) < 0.001) { setDisplay(value); return; }
    let raf = 0;
    const run = (t: number) => {
      const p = Math.min(1, (t - start) / 650);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(origin + delta * eased);
      if (p < 1) raf = requestAnimationFrame(run);
      else from.current = value;
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className={cn("num", className)}>
      {prefix}{display.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}{suffix}
    </span>
  );
}
