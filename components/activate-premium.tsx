"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Crown, Loader2, Zap } from "lucide-react";
import { useToast } from "./toast";

export function ActivatePremium({
  signedIn,
  premium,
  label,
  credits,
  price,
}: {
  signedIn: boolean;
  premium: boolean;
  label: string;
  credits: number;
  price: number;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  if (premium) {
    return (
      <div className="mt-6 flex items-center justify-center gap-1.5 rounded-lg border border-[rgba(255,192,97,.28)] bg-[rgba(255,192,97,.08)] px-3 py-2.5 text-[11px] font-semibold text-[#ffd08d]">
        <Crown size={13} /> {label}
      </div>
    );
  }

  if (!signedIn) {
    return (
      <Link href="/signup" className="btn btn-primary mt-6 w-full">
        Create free account <ArrowRight size={14} />
      </Link>
    );
  }

  if (credits < price) {
    return (
      <div className="mt-6 space-y-2">
        <Link href="/learn" className="btn btn-dark w-full">
          <Zap size={14} /> Earn credits in Learning
        </Link>
        <p className="text-center text-[9.5px] text-muted">
          You have {credits} credits. Premium needs {price}.
        </p>
      </div>
    );
  }

  async function activate() {
    setBusy(true);
    try {
      const res = await fetch("/api/plans/activate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not activate Premium.");
      push({
        tone: "success",
        title: "Premium is live",
        body: `${data.days} days unlocked. No cash was charged.`,
      });
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Activation failed", body: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={activate} disabled={busy} className="btn btn-primary mt-6 w-full">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
      {busy ? "Activating…" : `Activate for ${price} credits`}
    </button>
  );
}
