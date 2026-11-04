"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronUp, Languages } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n";
import { useLang } from "./language-provider";
import { cn } from "./ui";

export function LanguageDock() {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} dir="ltr" data-no-i18n className="fixed bottom-4 left-4 z-[75] print:hidden">
      {open && (
        <div className="mb-2 w-[232px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a101a]/95 shadow-[0_24px_60px_-20px_rgba(0,0,0,.85)] backdrop-blur-2xl">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3.5 py-2.5">
            <Languages size={13} className="text-[#5beeb9]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t("Language")}</span>
          </div>
          <div className="p-1.5">
            {LANGUAGES.map((option) => {
              const selected = option.code === lang;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    setLang(option.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                    selected ? "bg-[rgba(47,227,160,.09)] text-[#eafff7]" : "text-[#b9c2d2] hover:bg-white/[0.05] hover:text-ink",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-[10px] font-semibold text-muted">
                    {option.code.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-medium leading-tight">{option.native}</span>
                    <span className="block text-[9.5px] text-muted">{option.label}</span>
                  </span>
                  {selected && <Check size={13} className="shrink-0 text-[#5beeb9]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Change language"
        title={t("Language")}
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/10 bg-[#0a101a]/90 py-2 pl-2.5 pr-3 text-[11.5px] font-medium text-[#dbe3f0] shadow-[0_14px_40px_-16px_rgba(0,0,0,.9)] backdrop-blur-xl transition hover:border-white/20 hover:bg-[#0e1622]/95",
          open && "border-[rgba(47,227,160,.3)] text-ink",
        )}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(47,227,160,.1)] text-[#5beeb9]">
          <Languages size={11} />
        </span>
        <span>{active.native}</span>
        <ChevronUp size={12} className={cn("text-muted transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}
