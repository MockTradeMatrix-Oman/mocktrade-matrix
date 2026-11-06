"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, Camera, Check, CheckCircle2, ChevronLeft, Copy, ExternalLink,
  FileText, ImageUp, Loader2, Lock, RefreshCw, ScanFace, ScanLine, ShieldCheck, Sparkles,
  Trash2, Upload, Users, XCircle, Zap,
} from "lucide-react";
import { Wordmark } from "./logo";
import { Badge, Progress, cn } from "./ui";
import { useToast } from "./toast";

type VerifyUser = {
  id: number;
  name: string;
  email: string;
  id_verified: number;
  verified_name: string | null;
  verified_address: string | null;
  guardian_status: string;
  terms_accepted: number;
  guardian_email: string | null;
  dob: string | null;
};

const STEPS = [
  { id: 0, label: "Start", icon: ShieldCheck },
  { id: 1, label: "Identity", icon: ScanFace },
  { id: 2, label: "Guardian", icon: Users },
  { id: 3, label: "Agreements", icon: FileText },
  { id: 4, label: "Finish", icon: CheckCircle2 },
];

type AgreementKey = "simulation" | "risk" | "data" | "age";

const DOCS = [
  { id: "aadhaar", label: "Aadhaar", note: "India · 12-digit", hint: "Front side: your name, full address and the 12-digit Aadhaar number must all be visible." },
  { id: "pan", label: "PAN card", note: "India · tax ID", hint: "Your name, address and the 10-character PAN (e.g. ABCDE1234F) must be readable." },
  { id: "passport", label: "Passport", note: "International", hint: "Photo page: name, address, passport number and the machine-readable lines." },
  { id: "license", label: "Driver's licence", note: "Regional", hint: "Name, address and the licence number must all be legible in one photo." },
];

type CheckKey = "readable" | "name" | "address" | "number";

type DocResult = {
  ok: boolean;
  error?: string;
  checks?: Partial<Record<CheckKey, boolean>>;
  reasons?: string[];
  confidence?: number;
  name?: string | null;
  address?: string | null;
};

const CHECK_LABELS: Array<{ key: CheckKey; label: string }> = [
  { key: "name", label: "Name matches your account" },
  { key: "address", label: "Full address with PIN / ZIP" },
  { key: "number", label: "Document number detected" },
];

const AGREEMENTS: Array<{ key: AgreementKey; title: string; body: string }> = [
  {
    key: "simulation",
    title: "This is a simulation, not a real broker",
    body: "All prices, orders and portfolios are simulated. No real money, securities or crypto is ever bought, sold or held for you.",
  },
  {
    key: "risk",
    title: "Nothing here is financial advice",
    body: "Scores, forecasts and rankings are educational. They are not a recommendation to buy or sell any asset, and simulated results do not predict real outcomes.",
  },
  {
    key: "data",
    title: "I consent to my ID being read on this device",
    body: "The document image is deleted immediately after the check. Only my verified name, address, document type, a one-way hash and the result are stored.",
  },
  {
    key: "age",
    title: "My age and guardian details are accurate",
    body: "If I am under 18, a guardian must approve access. I confirm the details I gave are true and that I can be asked to re-verify.",
  },
];

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function VerifyWizard({ user }: { user: VerifyUser }) {
  const router = useRouter();
  const { push } = useToast();
  const declined = user.guardian_status === "declined";
  const needsGuardian = user.guardian_status === "pending" || declined;

  const initialStep = !user.id_verified ? 0 : needsGuardian ? 2 : user.terms_accepted ? 4 : 3;
  const [step, setStep] = useState(initialStep);
  const [doc, setDoc] = useState("aadhaar");
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(Boolean(user.id_verified));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DocResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState(user.guardian_email ?? "");
  const [requestSent, setRequestSent] = useState(false);
  const [requestUrl, setRequestUrl] = useState<string | null>(null);
  const [emailState, setEmailState] = useState<{ sent: boolean; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [guardianApproved, setGuardianApproved] = useState(user.guardian_status === "approved" || user.guardian_status === "not_required");
  const [agreements, setAgreements] = useState<Record<AgreementKey, "yes" | "no" | null>>({
    simulation: null,
    risk: null,
    data: null,
    age: null,
  });
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const activeDoc = DOCS.find((d) => d.id === doc) ?? DOCS[0];
  const allAgreed = AGREEMENTS.every((a) => agreements[a.key] === "yes");
  const signed = allAgreed && confirmText.trim().toUpperCase() === "YES";
  const canContinue = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return scanDone;
    if (step === 2) return guardianApproved || !needsGuardian;
    if (step === 3) return signed;
    return true;
  }, [step, scanDone, guardianApproved, needsGuardian, signed]);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  async function post(action: string, extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
    return data;
  }

  function chooseFile(next: File | null | undefined) {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      push({ tone: "error", title: "Unsupported file", body: "Upload a JPG, PNG or WEBP photo of your document." });
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      push({ tone: "error", title: "Image too large", body: "Keep the photo under 10 MB." });
      return;
    }
    if (next.size < 4_000) {
      push({ tone: "error", title: "Image too small", body: "Use a full-resolution photo so the text can be read." });
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setPreview(url);
    setFile(next);
    setResult(null);
  }

  function clearFile() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    setFile(null);
    setResult(null);
    if (uploadRef.current) uploadRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  async function verifyDocument() {
    if (!file || scanning) return;
    setScanning(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("docType", doc);
      const res = await fetch("/api/verify/document", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as DocResult;
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      setResult(data);
      if (res.ok && data.ok) {
        setScanDone(true);
        push({
          tone: "success",
          title: "Identity verified",
          body: "Your name and address matched. The image has been deleted.",
        });
      } else {
        push({
          tone: "error",
          title: "Document rejected",
          body: data.reasons?.[0] ?? data.error ?? "The document did not pass verification.",
        });
      }
    } catch {
      push({ tone: "error", title: "Verifier unreachable", body: "Check your connection and try again." });
    } finally {
      setScanning(false);
    }
  }

  async function sendGuardian() {
    setBusy(true);
    try {
      const res = await fetch("/api/guardian/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guardianEmail: guardianEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the consent request.");
      setRequestSent(true);
      setRequestUrl(data.url);
      setEmailState({ sent: Boolean(data.emailSent), error: data.emailError });
      if (data.emailSent) {
        push({ tone: "success", title: "Consent email sent", body: `We emailed ${data.guardianEmail}. The page advances as soon as they decide.` });
      } else {
        push({
          tone: "info",
          title: "Consent link ready",
          body: data.emailError ?? `Email could not be sent. Copy the link below and share it with ${data.guardianEmail}.`,
        });
      }
    } catch (err: any) {
      push({ tone: "error", title: "Request failed", body: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!requestUrl) return;
    const absolute = `${window.location.origin}${requestUrl}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      push({ tone: "success", title: "Link copied", body: "Send it to your guardian. They can approve without an account." });
    } catch {
      push({ tone: "info", title: "Copy manually", body: absolute });
    }
  }

  useEffect(() => {
    if (!requestSent || guardianApproved) return;
    let cancelled = false;
    const check = async () => {
      const res = await fetch("/api/guardian/request", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      if (data.guardianStatus === "approved") {
        setGuardianApproved(true);
        push({ tone: "success", title: "Guardian approved", body: "Simulated trading access has been authorised." });
      }
    };
    const id = setInterval(check, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [requestSent, guardianApproved, push]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/guardian/request", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      if (data.guardianStatus === "approved") setGuardianApproved(true);
      if (data.request && data.request.status === "pending") {
        setRequestSent(true);
        setRequestUrl(data.request.url);
        setGuardianEmail(data.request.guardian_email);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function acceptTerms() {
    if (!signed) return;
    setBusy(true);
    try {
      await post("terms", { agreements, confirmation: confirmText.trim().toUpperCase() });
      setStep(4);
      push({ tone: "success", title: "Signed and recorded", body: "Every agreement was accepted. Your account is now unlocked." });
    } catch (err: any) {
      push({ tone: "error", title: "Could not save", body: err.message });
    } finally {
      setBusy(false);
    }
  }

  const pct = (step / 4) * 100;
  const verifiedName = result?.ok ? result.name : user.verified_name;
  const verifiedAddress = result?.ok ? result.address : user.verified_address;

  return (
    <div className="relative min-h-screen bg-bg">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[520px]" style={{ background: "radial-gradient(55% 100% at 50% -10%, rgba(47,227,160,.12), transparent 70%)" }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] grid-bg opacity-30" />

      <div className="relative z-10 mx-auto max-w-[1020px] px-5 py-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0"><Wordmark /></Link>
          <Badge tone="green" className="hidden sm:inline-flex"><ShieldCheck size={10} /> Real ID check · no document = no access</Badge>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[260px_1fr]">
          {/* compact mobile progress */}
          <div className="card p-4 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">Setup</div>
                <div className="truncate text-[12.5px] font-semibold">{user.name}</div>
              </div>
              <div className="num shrink-0 text-[11px] font-semibold text-[#5beeb9]">{Math.round(pct)}%</div>
            </div>
            <Progress value={pct} className="mt-2.5" />
            <div className="mt-3 flex items-center justify-between gap-1">
              {STEPS.map((s) => {
                const done = s.id < step;
                const active = s.id === step;
                return (
                  <div key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-bold",
                      done ? "border-[rgba(47,227,160,.4)] bg-[rgba(47,227,160,.14)] text-[#5beeb9]"
                        : active ? "border-[rgba(47,227,160,.4)] bg-[rgba(47,227,160,.1)] text-[#5beeb9]"
                        : "border-white/[0.08] bg-white/[0.02] text-muted/60")}>
                      {done ? <Check size={11} strokeWidth={3} /> : <s.icon size={11} />}
                    </span>
                    <span className={cn("w-full truncate text-center text-[9px] font-medium", active ? "text-ink" : "text-muted/60")}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* rail */}
          <aside className="card hidden h-fit p-5 lg:block">
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">Setup</div>
            <div className="mt-1 text-[13px] font-semibold">{user.name}</div>
            <div className="truncate text-[10px] text-muted">{user.email}</div>

            <div className="mt-4">
              <Progress value={pct} />
              <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-muted">
                <span>Step {Math.min(step + 1, 5)} of 5</span>
                <span className="num">{Math.round(pct)}%</span>
              </div>
            </div>

            <div className="mt-5 space-y-1">
              {STEPS.map((s) => {
                const done = s.id < step;
                const active = s.id === step;
                return (
                  <div key={s.id} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2",
                    active ? "border border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.06)]" : "border border-transparent")}>
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                      done ? "border-[rgba(47,227,160,.4)] bg-[rgba(47,227,160,.14)] text-[#5beeb9]"
                        : active ? "border-[rgba(47,227,160,.4)] bg-[rgba(47,227,160,.1)] text-[#5beeb9]"
                        : "border-white/[0.08] bg-white/[0.02] text-muted/60")}>
                      {done ? <Check size={11} strokeWidth={3} /> : <s.icon size={11} />}
                    </span>
                    <span className={cn("text-[11px] font-medium", active ? "text-ink" : done ? "text-[#b9c2d2]" : "text-muted/70")}>{s.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2fe3a0]" />}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-lg border border-white/[0.06] bg-black/20 p-3">
              <div className="flex items-center gap-1.5 text-[9.5px] font-semibold text-[#ffd08d]"><Zap size={10} /> 100 credits waiting</div>
              <p className="mt-1 text-[9.5px] leading-relaxed text-muted">Complete onboarding to unlock your simulation account and first module.</p>
            </div>
          </aside>

          {/* panel */}
          <div className="card overflow-hidden">
            <div className="border-b border-white/[0.06] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#5beeb9]">
                <Lock size={11} /> Secure onboarding
              </div>
              <h1 className="mt-2 text-[22px] font-semibold tracking-tight">
                {step === 0 && "Before you start"}
                {step === 1 && "Verify your identity"}
                {step === 2 && "Guardian consent"}
                {step === 3 && "Agreements and consent"}
                {step === 4 && "You're in."}
              </h1>
              <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-muted">
                {step === 0 && "Four short steps: identity, guardian consent if you are under 18, agreements, then access. Nothing is skipped — the rest of the app stays locked until every step is complete."}
                {step === 1 && "Upload a real government ID. We read it on this machine, keep only your name and address, and delete the image immediately. If the name and address are not found, access stays locked."}
                {step === 2 && "Because you are under 18, a guardian must approve simulated trading access before you can place orders. We email them a private consent link."}
                {step === 3 && "Read each statement and answer it explicitly. Then type YES to sign. The confirmation is recorded with a timestamp against your account."}
                {step === 4 && "Your account is verified and your simulation is funded. Time to learn by doing."}
              </p>
            </div>

            <div className="p-4 sm:p-6">
              {step === 0 && (
                <div className="animate-fade-in space-y-3">
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">Have these ready</div>
                    <ul className="mt-2.5 space-y-2">
                      {[
                        "One government photo ID — Aadhaar, PAN, passport or driving licence.",
                        "A clear, well-lit photo where the name and address are readable.",
                        "Two minutes without interruptions.",
                        "If you are under 18: a guardian's email address for consent.",
                      ].map((line) => (
                        <li key={line} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[#c6cfdd]">
                          <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(47,227,160,.16)] text-[#5beeb9]">
                            <Check size={9} strokeWidth={3} />
                          </span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">What happens, in order</div>
                    <ol className="mt-2.5 space-y-2">
                      {[
                        "Identity — your document is read on this device, then deleted.",
                        "Guardian — only if you are under 18. We email them a private approval link.",
                        "Agreements — four statements, each answered explicitly, then you type YES.",
                        "Access — the dashboard, trading and the arena unlock.",
                      ].map((line, i) => (
                        <li key={line} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[#c6cfdd]">
                          <span className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/15 text-[8.5px] font-bold text-muted">{i + 1}</span>
                          {line}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted/70">
                    <ShieldCheck size={11} className="mt-0.5 shrink-0 text-[#5beeb9]" />
                    You can stop at any point and come back. Nothing is shared with third parties, and no real capital is ever at risk.
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="animate-fade-in">
                  {scanDone ? (
                    <div className="rounded-2xl border border-[rgba(47,227,160,.24)] bg-[rgba(47,227,160,.05)] p-6 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.1)]">
                        <ShieldCheck size={26} className="text-[#5beeb9]" />
                      </div>
                      <div className="mt-3 text-[15px] font-semibold">Document verified</div>
                      <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-muted">
                        The name and address on your ID matched this account. The image was deleted straight after the check.
                      </p>
                      <div className="mx-auto mt-4 max-w-sm space-y-1.5 rounded-xl border border-white/[0.07] bg-black/20 p-3 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[9.5px] uppercase tracking-wide text-muted">Verified name</span>
                          <span className="text-right text-[11px] font-medium">{verifiedName ?? user.name}</span>
                        </div>
                        {verifiedAddress && (
                          <div className="flex items-start justify-between gap-3 border-t border-white/[0.05] pt-1.5">
                            <span className="shrink-0 text-[9.5px] uppercase tracking-wide text-muted">Address</span>
                            <span className="text-right text-[10.5px] leading-relaxed text-muted">{verifiedAddress}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <button onClick={() => setStep(2)} className="btn btn-primary btn-sm">
                          Continue to guardian step <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {DOCS.map((d) => (
                          <button key={d.id} onClick={() => setDoc(d.id)} disabled={scanning}
                            className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition",
                              doc === d.id ? "border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.07)]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/15")}>
                            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border",
                              doc === d.id ? "border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.1)] text-[#5beeb9]" : "border-white/[0.07] bg-white/[0.03] text-muted")}>
                              <FileText size={14} />
                            </span>
                            <div>
                              <div className={cn("text-[11.5px] font-semibold", doc === d.id && "text-[#8df5d0]")}>{d.label}</div>
                              <div className="text-[9.5px] text-muted">{d.note}</div>
                            </div>
                          </button>
                        ))}
                      </div>

                      <p className="mt-2.5 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted">
                        <ScanLine size={11} className="mt-0.5 shrink-0 text-[#5beeb9]" /> {activeDoc.hint}
                      </p>

                      <input
                        ref={uploadRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/bmp"
                        className="hidden"
                        onChange={(e) => chooseFile(e.target.files?.[0])}
                      />
                      <input
                        ref={cameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => chooseFile(e.target.files?.[0])}
                      />

                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          chooseFile(e.dataTransfer.files?.[0]);
                        }}
                        className={cn("relative mt-4 overflow-hidden rounded-2xl border border-dashed p-4 transition",
                          dragOver ? "border-[#2fe3a0]/60 bg-[rgba(47,227,160,.06)]" : "border-white/[0.12] bg-[#060a11]")}
                      >
                        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
                        {preview ? (
                          <div className="relative">
                            <img src={preview} alt="Selected document preview" className="mx-auto max-h-[250px] w-auto max-w-full rounded-xl border border-white/[0.08] bg-black/40 object-contain" />
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0 text-[10px] text-muted">
                                <div className="truncate font-medium text-ink/90">{file?.name}</div>
                                <div>{file ? formatBytes(file.size) : ""} · {activeDoc.label}</div>
                              </div>
                              <div className="flex gap-1.5">
                                <button onClick={clearFile} disabled={scanning} className="btn btn-dark btn-sm">
                                  <Trash2 size={12} /> Remove
                                </button>
                                <button onClick={verifyDocument} disabled={scanning} className="btn btn-primary btn-sm">
                                  {scanning ? <><Loader2 size={13} className="animate-spin" /> Reading…</> : <><ScanLine size={13} /> Verify document</>}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative flex flex-col items-center py-5 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.03]">
                              <ImageUp size={24} className="text-muted" />
                            </div>
                            <div className="mt-3 text-[12px] font-semibold">Drop your document here</div>
                            <div className="mt-1 text-[10px] text-muted">JPG, PNG, WEBP or BMP · up to 10 MB</div>
                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                              <button onClick={() => uploadRef.current?.click()} className="btn btn-primary btn-sm">
                                <Upload size={13} /> Upload photo
                              </button>
                              <button onClick={() => cameraRef.current?.click()} className="btn btn-ghost btn-sm">
                                <Camera size={13} /> Use camera
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                        <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">What must match</div>
                        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {CHECK_LABELS.map((c) => {
                            const state = result?.checks?.[c.key];
                            return (
                              <div key={c.key} className="flex items-center gap-2 text-[10.5px]">
                                {state === true ? (
                                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(47,227,160,.16)] text-[#5beeb9]"><Check size={10} strokeWidth={3} /></span>
                                ) : state === false ? (
                                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(255,93,122,.14)] text-[#ff8fa3]"><XCircle size={10} /></span>
                                ) : (
                                  <span className="h-4 w-4 shrink-0 rounded-full border border-white/15" />
                                )}
                                <span className={cn(state === false ? "text-[#ffb3c0]" : state === true ? "text-ink/85" : "text-muted")}>{c.label}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[9.5px] leading-relaxed text-muted/60">
                          Image sharpness is not scored. Only the three fields above decide the outcome.
                        </p>
                      </div>

                      {scanning && (
                        <div className="mt-4 rounded-xl border border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.05)] p-3.5">
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#8df5d0]">
                            <Loader2 size={13} className="animate-spin" /> Reading your document…
                          </div>
                          <p className="mt-1 text-[10px] leading-relaxed text-muted">
                            Extracting text, matching your account name, checking the address and document number. This usually takes a few seconds.
                          </p>
                          <Progress value={70} className="mt-2.5" />
                        </div>
                      )}

                      {result && !result.ok && (
                        <div className="mt-4 rounded-xl border border-[rgba(255,93,122,.28)] bg-[rgba(255,93,122,.06)] p-4">
                          <div className="flex items-center gap-2 text-[11.5px] font-semibold text-[#ffb3c0]">
                            <AlertTriangle size={13} /> Document rejected — access stays locked
                          </div>
                          <ul className="mt-2 space-y-1">
                            {(result.reasons?.length ? result.reasons : [result.error ?? "The document did not pass verification."]).map((r) => (
                              <li key={r} className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#ff8fa3]" /> {r}
                              </li>
                            ))}
                          </ul>
                          {typeof result.confidence === "number" && (
                            <div className="mt-2 text-[9.5px] text-muted/60">OCR confidence: {result.confidence}%</div>
                          )}
                        </div>
                      )}

                      <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted/60">
                        <ShieldCheck size={11} className="mt-0.5 shrink-0" />
                        The image is deleted immediately after reading. Only your name, address, document type, a one-way hash and the result are stored on this device.
                      </p>
                    </>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="animate-fade-in">
                  {!needsGuardian || guardianApproved ? (
                    <div className="rounded-2xl border border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.05)] p-6 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.1)]">
                        <ShieldCheck size={24} className="text-[#5beeb9]" />
                      </div>
                      <div className="mt-3 text-[14px] font-semibold">Guardian approval on file</div>
                      <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-muted">
                        Your guardian has authorised simulated trading access. This can be revoked at any time from account settings.
                      </p>
                    </div>
                  ) : (
                    <>
                      {declined && (
                        <div className="mb-4 rounded-xl border border-[rgba(255,93,122,.28)] bg-[rgba(255,93,122,.06)] p-4">
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#ffb3c0]">
                            <XCircle size={13} /> Guardian consent is not active
                          </div>
                          <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                            Either your guardian declined access or consent was withdrawn from account settings. Send a new
                            consent link whenever you are ready — earlier decisions stay on record.
                          </p>
                        </div>
                      )}

                      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(139,123,255,.2)] bg-[rgba(139,123,255,.08)] text-[#b3a8ff]"><Users size={16} /></span>
                          <div>
                            <div className="text-[12px] font-semibold">Why a guardian?</div>
                            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                              Learners under 18 can explore markets safely only with adult consent. We email your guardian a
                              private link, they review what the simulation is, and approve — no account required.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="label" htmlFor="guardian-email">Guardian email</label>
                        <input
                          id="guardian-email"
                          type="email"
                          className="input"
                          placeholder="parent@example.com"
                          value={guardianEmail}
                          onChange={(e) => setGuardianEmail(e.target.value)}
                          disabled={busy}
                        />
                        <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted/70">
                          We email this address a private one-time consent link. Your guardian does not need an account.
                        </p>
                      </div>

                      {!requestUrl ? (
                        <button onClick={sendGuardian} disabled={busy || !guardianEmail.includes("@")} className="btn btn-primary mt-4 w-full">
                          {busy ? "Sending…" : declined ? "Email a new consent link" : "Email consent link"} {!busy && <ArrowRight size={14} />}
                        </button>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <div className="rounded-xl border border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.05)] p-4">
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#ffd08d]">
                              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[#ffc061]" /> Awaiting guardian approval
                            </div>
                            <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                              {emailState?.sent ? (
                                <>Consent email sent to <span className="font-semibold text-ink/90">{guardianEmail}</span>. They can approve or decline from that private link — this page updates automatically.</>
                              ) : emailState ? (
                                <>Email not sent. Copy the private link below and share it with <span className="font-semibold text-ink/90">{guardianEmail}</span>.</>
                              ) : (
                                <>A consent request is already waiting for <span className="font-semibold text-ink/90">{guardianEmail}</span>. Use the link below, or resend the email.</>
                              )}
                            </p>
                            {!emailState?.sent && emailState?.error && (
                              <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#ffb3c0]">{emailState.error}</p>
                            )}
                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-2">
                              <code className="min-w-0 flex-1 truncate text-[10px] text-[#b9c2d2]">{requestUrl}</code>
                              <button onClick={copyLink} className="btn btn-dark btn-sm shrink-0" aria-label="Copy consent link">
                                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <a href={requestUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                                <ExternalLink size={12} /> Open guardian page
                              </a>
                              <button onClick={sendGuardian} disabled={busy} className="btn btn-dark btn-sm">
                                <RefreshCw size={12} /> {busy ? "Sending…" : "Resend email"}
                              </button>
                            </div>
                          </div>
                          <p className="text-[9.5px] leading-relaxed text-muted/60">
                            The link is private and stays valid until your guardian decides. You can also open it yourself to preview the consent page.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="animate-fade-in space-y-3">
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">Signing for</div>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      <div className="flex items-center justify-between gap-3 text-[10.5px]">
                        <span className="text-muted">Account</span>
                        <span className="truncate font-medium">{user.name}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[10.5px]">
                        <span className="text-muted">Email</span>
                        <span className="truncate font-medium">{user.email}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[10.5px]">
                        <span className="text-muted">Identity</span>
                        <span className={cn("font-medium", scanDone ? "text-[#8df5d0]" : "text-[#ffd08d]")}>{scanDone ? "Verified" : "Pending"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[10.5px]">
                        <span className="text-muted">Guardian</span>
                        <span className={cn("font-medium", guardianApproved ? "text-[#8df5d0]" : "text-[#ffd08d]")}>
                          {guardianApproved ? "Approved" : needsGuardian ? "Pending" : "Not required"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {AGREEMENTS.map((a, i) => {
                    const value = agreements[a.key];
                    return (
                      <div
                        key={a.key}
                        className={cn(
                          "rounded-xl border p-4 transition",
                          value === "yes"
                            ? "border-[rgba(47,227,160,.28)] bg-[rgba(47,227,160,.05)]"
                            : value === "no"
                              ? "border-[rgba(255,93,122,.3)] bg-[rgba(255,93,122,.05)]"
                              : "border-white/[0.07] bg-white/[0.02]"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.03] text-[10px] font-bold text-muted">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold">{a.title}</div>
                            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{a.body}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 pl-8">
                          <button
                            type="button"
                            onClick={() => setAgreements((s) => ({ ...s, [a.key]: "yes" }))}
                            aria-pressed={value === "yes"}
                            className={cn("btn btn-sm", value === "yes" ? "btn-primary" : "btn-dark")}
                          >
                            <Check size={12} strokeWidth={3} /> Yes, I agree
                          </button>
                          <button
                            type="button"
                            onClick={() => setAgreements((s) => ({ ...s, [a.key]: "no" }))}
                            aria-pressed={value === "no"}
                            className={cn("btn btn-sm", value === "no" ? "btn-danger" : "btn-dark")}
                          >
                            <XCircle size={12} /> No
                          </button>
                          {value && (
                            <span className={cn("ml-auto text-[10px] font-medium", value === "yes" ? "text-[#8df5d0]" : "text-[#ffb3c0]")}>
                              {value === "yes" ? "Accepted" : "Declined"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {Object.values(agreements).includes("no") && (
                    <div className="rounded-xl border border-[rgba(255,93,122,.28)] bg-[rgba(255,93,122,.06)] p-3.5 text-[10.5px] leading-relaxed text-[#ffb3c0]">
                      Every statement must be accepted to use the simulation. Change your answer, or leave and come back later.
                    </div>
                  )}

                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <label htmlFor="sign-yes" className="text-[11px] font-semibold">
                      Type{" "}
                      <span className="rounded bg-[rgba(47,227,160,.14)] px-1.5 py-0.5 font-mono text-[#8df5d0]">YES</span>{" "}
                      to sign
                    </label>
                    <input
                      id="sign-yes"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="YES"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={busy}
                      className={cn("input mt-2 font-mono tracking-[0.2em]", signed && "border-[rgba(47,227,160,.5)]")}
                    />
                    <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted/70">
                      Your confirmation, the four answers and a timestamp are stored with your account as a consent record.
                    </p>
                  </div>

                  <p className="pt-1 text-center text-[9.5px] leading-relaxed text-muted/60">
                    Full detail:{" "}
                    <Link href="/legal#simulation-terms" className="text-[#8df5d0] underline-offset-2 hover:underline">simulation terms</Link>,{" "}
                    <Link href="/legal#privacy" className="text-[#8df5d0] underline-offset-2 hover:underline">privacy</Link>,{" "}
                    <Link href="/legal#guardian-policy" className="text-[#8df5d0] underline-offset-2 hover:underline">guardian policy</Link>,{" "}
                    <Link href="/legal#risk-disclosure" className="text-[#8df5d0] underline-offset-2 hover:underline">risk disclosure</Link>.
                  </p>

                  <button onClick={acceptTerms} disabled={!signed || busy} className="btn btn-primary w-full">
                    {busy ? <><Loader2 size={14} className="animate-spin" /> Recording…</> : <>Sign and enter the matrix <ArrowRight size={14} /></>}
                  </button>
                  {!signed && (
                    <p className="text-center text-[9.5px] text-muted/60">
                      Answer all four statements with Yes and type YES to enable signing.
                    </p>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="animate-fade-in">
                  <div className="relative overflow-hidden rounded-2xl border border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.05)] p-8 text-center">
                    <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(47,227,160,.18), transparent 70%)" }} />
                    <div className="relative">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.12)] glow-green">
                        <Sparkles size={28} className="text-[#5beeb9]" />
                      </div>
                      <h2 className="mt-4 text-[20px] font-semibold tracking-tight">Welcome to MockTrade Matrix</h2>
                      <p className="mx-auto mt-2 max-w-sm text-[11.5px] leading-relaxed text-muted">
                        Your simulation is funded with virtual capital and 100 credits. The first module is already
                        unlocked — start with risk before you start with returns.
                      </p>
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                        <Link href="/dashboard" className="btn btn-primary">Open dashboard <ArrowRight size={14} /></Link>
                        <Link href="/learn" className="btn btn-ghost">Start first module</Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {step < 4 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 sm:px-5">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="btn btn-dark btn-sm disabled:opacity-30"
                >
                  <ChevronLeft size={13} /> Back
                </button>
                <button
                  onClick={() => setStep((s) => Math.min(4, s + 1))}
                  disabled={!canContinue}
                  className={cn("btn btn-primary btn-sm", step === 3 && "invisible")}
                >
                  {step === 0 ? "Start verification" : "Continue"} <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] text-muted/60">
          <ShieldCheck size={10} className="mr-1 inline" /> Real ID check · No real capital at risk · Simulation only
        </p>
      </div>
    </div>
  );
}
