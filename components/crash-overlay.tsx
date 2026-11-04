"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownRight, ShieldCheck } from "lucide-react";
import { useMarket } from "./socket";
import { Modal } from "./ui";

export function CrashOverlay() {
  const { crash } = useMarket();
  const [dismissed, setDismissed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (crash.phase !== "recovery") {
      setDismissed(false);
      return;
    }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((crash.endsAt - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [crash.phase, crash.endsAt]);

  const open = crash.phase === "recovery" && !dismissed;
  const pct = crash.endsAt ? Math.max(0, Math.min(100, 100 - (secondsLeft / 360) * 100)) : 0;

  return (
    <Modal
      open={open}
      onClose={() => setDismissed(true)}
      width={520}
      title={
        <span className="flex items-center gap-2 text-[#ffb3c0]">
          <AlertTriangle size={17} /> Forced market crash drill
        </span>
      }
      subtitle="This is a built-in training event, not a bug. Every learner experiences it."
    >
      <div className="p-5">
        <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,93,122,.22)] bg-[rgba(255,93,122,.06)] p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,93,122,.25), transparent 70%)" }} />
          <div className="flex items-end gap-3">
            <div className="num text-[44px] font-semibold leading-none text-[#ff8fa3]">−50%</div>
            <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[#ffb3c0]">
              <ArrowDownRight size={13} /> simulated drawdown
            </div>
          </div>
          <p className="mt-3 max-w-sm text-[12.5px] leading-relaxed text-[#e3b6bf]">
            Every asset on the tape has been repriced 50% lower. Your portfolio is marked down with the market.
            The first time this happens should never be with real money.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted">Simulated recovery window</span>
            <span className="num font-semibold text-[#8df5d0]">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1fc98a] to-[#4cf0b4] transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2.5 text-[10.5px] leading-relaxed text-muted">
            Markets drift back up during the window. Watch how it feels — that reaction is the lesson, not the number.
          </p>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#5beeb9]" />
          <p className="text-[11px] leading-relaxed text-muted">
            Zero real capital is at risk. This drill exists so the first real drawdown you meet is one you have already survived once.
          </p>
        </div>

        <button onClick={() => setDismissed(true)} className="btn btn-primary mt-4 w-full">
          Stay calm — continue the drill
        </button>
      </div>
    </Modal>
  );
}
