"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * Celebration host: a small burst of confetti plus an optional chime.
 *
 * Motion is automatically suppressed by the global
 * `prefers-reduced-motion: reduce` rule. Sound is off by default and stored
 * per browser, so nothing plays until the learner turns it on.
 */
type Burst = {
  id: number;
  title: string;
  body?: string;
  tone: "green" | "violet" | "amber";
};

type CelebrationApi = {
  celebrate: (burst: Omit<Burst, "id">) => void;
  soundOn: boolean;
  setSoundOn: (value: boolean) => void;
};

const CelebrationCtx = createContext<CelebrationApi>({
  celebrate: () => {},
  soundOn: false,
  setSoundOn: () => {},
});

export const SOUND_STORAGE_KEY = "mtm_sound";

export function useCelebration() {
  return useContext(CelebrationCtx);
}

const COLORS = ["#2fe3a0", "#8b7bff", "#ffc061", "#4cc9f0", "#ff8fa3", "#d8ff6b"];

function chime(kind: "chime" | "fanfare") {
  try {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    const notes = kind === "fanfare" ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 880];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + index * 0.08;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    // Audio is a nicety; never let it break a reward.
  }
}

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [burst, setBurst] = useState<Burst | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const counter = useRef(1);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      setSoundOn(window.localStorage.getItem(SOUND_STORAGE_KEY) === "on");
    } catch {
      // Private mode or storage disabled: keep sound off.
    }
  }, []);

  const updateSound = useCallback((value: boolean) => {
    setSoundOn(value);
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, value ? "on" : "off");
    } catch {
      // Preference simply will not persist.
    }
  }, []);

  const celebrate = useCallback(
    (input: Omit<Burst, "id">) => {
      if (timeout.current) clearTimeout(timeout.current);
      setBurst({ ...input, id: counter.current++ });
      if (soundOn) chime(input.tone === "amber" ? "fanfare" : "chime");
      timeout.current = setTimeout(() => setBurst(null), 3600);
    },
    [soundOn]
  );

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  const value = useMemo(
    () => ({ celebrate, soundOn, setSoundOn: updateSound }),
    [celebrate, soundOn, updateSound]
  );

  const accent =
    burst?.tone === "violet"
      ? { border: "rgba(139,123,255,.35)", color: "#b3a8ff" }
      : burst?.tone === "amber"
        ? { border: "rgba(255,192,97,.38)", color: "#ffd08d" }
        : { border: "rgba(47,227,160,.35)", color: "#5beeb9" };

  return (
    <CelebrationCtx.Provider value={value}>
      {children}
      {burst && (
        <div className="pointer-events-none fixed inset-0 z-[130] overflow-hidden" aria-hidden="true">
          {Array.from({ length: 42 }).map((_, index) => {
            const left = (index * 37 + 11) % 100;
            const drift = ((index * 53) % 220) - 110;
            const delay = (index % 9) * 45;
            const duration = 1700 + (index % 7) * 180;
            const size = 5 + (index % 4) * 2;
            return (
              <span
                key={`${burst.id}-${index}`}
                className="fun-confetti"
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size + 3}px`,
                  background: COLORS[index % COLORS.length],
                  animationDelay: `${delay}ms`,
                  animationDuration: `${duration}ms`,
                  ["--drift" as string]: `${drift}px`,
                  ["--spin" as string]: `${(index % 2 ? 1 : -1) * (240 + (index % 5) * 90)}deg`,
                }}
              />
            );
          })}
          <div className="absolute inset-x-0 top-[18%] flex justify-center px-4">
            <div
              className="animate-pop rounded-2xl border px-5 py-3 text-center shadow-2xl backdrop-blur-xl"
              style={{
                borderColor: accent.border,
                background: "linear-gradient(160deg, rgba(18,24,36,.97), rgba(9,13,20,.97))",
                boxShadow: "0 30px 90px -32px rgba(0,0,0,.95)",
              }}
            >
              <div className="text-[15px] font-semibold tracking-tight" style={{ color: accent.color }}>
                {burst.title}
              </div>
              {burst.body && <div className="mt-1 text-[11.5px] text-muted">{burst.body}</div>}
            </div>
          </div>
        </div>
      )}
    </CelebrationCtx.Provider>
  );
}
