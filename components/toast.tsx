"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, Zap } from "lucide-react";

type Tone = "success" | "error" | "info" | "reward";
type ToastItem = { id: number; title: string; body?: string; tone: Tone };

const ToastCtx = createContext<{ push: (t: Omit<ToastItem, "id">) => void }>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

const toneStyle: Record<Tone, { border: string; icon: React.ReactNode; color: string }> = {
  success: { border: "rgba(47,227,160,.28)", color: "#6ff2c3", icon: <CheckCircle2 size={17} /> },
  error: { border: "rgba(255,93,122,.3)", color: "#ff92a6", icon: <AlertTriangle size={17} /> },
  info: { border: "rgba(139,123,255,.3)", color: "#b3a8ff", icon: <Info size={17} /> },
  reward: { border: "rgba(255,192,97,.3)", color: "#ffd08d", icon: <Zap size={17} /> },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(1);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = counter.current++;
    setItems((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 5000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[120] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2.5">
        {items.map((t) => {
          const s = toneStyle[t.tone];
          return (
            <div
              key={t.id}
              className="animate-pop flex items-start gap-3 rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl"
              style={{
                borderColor: s.border,
                background: "linear-gradient(160deg, rgba(18,24,36,.97), rgba(9,13,20,.97))",
                boxShadow: "0 24px 60px -24px rgba(0,0,0,.9)",
              }}
            >
              <span style={{ color: s.color }} className="mt-0.5 shrink-0">{s.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink">{t.title}</div>
                {t.body && <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{t.body}</div>}
              </div>
              <button
                onClick={() => setItems((prev) => prev.filter((i) => i.id !== t.id))}
                className="shrink-0 rounded-md p-1 text-muted transition hover:bg-white/5 hover:text-ink"
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
