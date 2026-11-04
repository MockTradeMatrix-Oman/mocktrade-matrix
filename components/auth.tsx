"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight, Calendar, Check, Eye, EyeOff, Lock, Mail, ShieldCheck, User, Users,
} from "lucide-react";
import { Wordmark } from "./logo";
import { Badge, cn } from "./ui";
import { GoogleButton } from "./google-auth";
import { MODES } from "@/lib/finance";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.02fr_.98fr]">
      <aside className="relative hidden overflow-hidden border-r border-white/[0.06] bg-[#070a11] lg:flex lg:flex-col">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="pointer-events-none absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(circle, rgba(47,227,160,.16), transparent 65%)" }} />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full" style={{ background: "radial-gradient(circle, rgba(139,123,255,.14), transparent 65%)" }} />

        <div className="relative z-10 flex items-center justify-between p-8">
          <Link href="/"><Wordmark /></Link>
          <span className="chip chip-green"><ShieldCheck size={11} /> Guardian-verified</span>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-10 xl:px-14">
          <h1 className="max-w-md text-[38px] font-semibold leading-[1.08] tracking-[-0.035em] xl:text-[44px]">
            Learn to lose.<br />
            <span className="text-[#2fe3a0]">Before it costs anything.</span>
          </h1>
          <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-muted">
            Five asset classes, real brokerage fees, capital gains tax, slippage and a forced crash drill — all simulated, all tracked live.
          </p>

          <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
            {[
              ["100", "starting credits"],
              ["5", "asset classes"],
              ["0", "real risk"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                <div className="num text-[20px] font-semibold text-[#eafff7]">{n}</div>
                <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.1em] text-muted">{l}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-md rounded-2xl border border-white/[0.08] bg-[#0b111b]/80 p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[9px] uppercase tracking-[0.14em] text-muted">How the simulation works</div>
                <div className="num mt-1 text-[24px] font-semibold">Start from zero</div>
                <div className="mt-1 text-[10.5px] text-muted">Your invested portfolio reads 0 until you place your first trade.</div>
              </div>
              <Badge tone="green"><span className="h-1 w-1 rounded-full bg-[#2fe3a0]" /> live</Badge>
            </div>
            <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-3">
              {[
                ["01", "Verify and pick India or the US"],
                ["02", "Trade real instruments with virtual capital"],
                ["03", "Watch every mark, fee and tax update live"],
              ].map(([n, t]) => (
                <div key={n} className="flex items-center gap-2.5 text-[10.5px]">
                  <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] text-[8.5px] font-bold text-muted">{n}</span>
                  <span className="text-[#c9d2e2]">{t}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-7 max-w-md text-[11.5px] italic leading-relaxed text-muted/80">
            “The goal isn’t just to teach students how to trade — it’s to teach them how it feels to win and lose responsibly.”
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 p-8 text-[10px] text-muted/60">
          <span>SDG 4 · Quality education</span>
          <span>SDG 8 · Economic growth</span>
          <span>SDG 12 · Responsible consumption</span>
        </div>
      </aside>

      <main className="relative flex items-center justify-center bg-bg px-5 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 lg:hidden" style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(47,227,160,.1), transparent 70%)" }} />
        <div className="relative w-full max-w-[410px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/"><Wordmark /></Link>
            <Link href="/" className="text-[11px] text-muted hover:text-ink">Back to site</Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function Field({
  icon, label, ...props
}: { icon: React.ReactNode; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70">{icon}</span>
        <input {...props} className="input pl-10" />
      </div>
    </div>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const credentials = adminMode ? { email: "admin", password } : { email, password };
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to sign in.");
      // Full navigation: guarantees the freshly-set session cookie is used and
      // avoids any client-router cache/redirect loops around /login.
      window.location.assign(data.redirect ?? "/dashboard");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  function toggleAdmin() {
    setAdminMode((v) => !v);
    setError("");
    setPassword("");
  }

  return (
    <div className="animate-fade-up">
      <div className="eyebrow">{adminMode ? "Admin access" : "Welcome back"}</div>
      <h2 className="mt-2 text-[26px] font-semibold tracking-tight">
        {adminMode ? "Open the admin console" : "Sign in to your matrix"}
      </h2>
      <p className="mt-1.5 text-[12.5px] text-muted">
        {adminMode
          ? "Restricted to the programme administrator. Student accounts cannot open this console."
          : "Your simulation, portfolio and ladder are exactly where you left them."}
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        {error && (
          <div className="rounded-xl border border-[rgba(255,93,122,.25)] bg-[rgba(255,93,122,.08)] px-3.5 py-2.5 text-[11.5px] text-[#ffb3c0]">
            {error}
          </div>
        )}
        {adminMode ? (
          <div>
            <label className="label">Admin ID</label>
            <div className="flex items-center gap-2 rounded-lg border border-[rgba(139,123,255,.25)] bg-[rgba(139,123,255,.07)] px-3.5 py-2.5">
              <ShieldCheck size={15} className="text-[#b3a8ff]" />
              <span className="num text-[12.5px] font-semibold text-[#d8d2ff]">admin</span>
              <span className="ml-auto text-[9px] uppercase tracking-[0.12em] text-[#b3a8ff]/70">console</span>
            </div>
          </div>
        ) : (
          <Field icon={<Mail size={15} />} label="Email" type="email" placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        )}
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70"><Lock size={15} /></span>
            <input type={show ? "text" : "password"} className="input pl-10 pr-10" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required
              autoComplete={adminMode ? "new-password" : "current-password"} autoFocus={adminMode} />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label="Toggle password">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Signing in…" : adminMode ? "Enter console" : "Sign in"} {!loading && <ArrowRight size={15} />}
        </button>

        {!adminMode && (
          <GoogleButton intent="login" onError={setError} />
        )}

        <button type="button" onClick={toggleAdmin} disabled={loading}
          className={cn("btn w-full", adminMode ? "btn-ghost" : "btn-dark")}>
          <ShieldCheck size={14} className={adminMode ? "text-[#b3a8ff]" : "text-muted"} />
          {adminMode ? "Back to student sign in" : "Admin sign in"}
        </button>
        <p className="text-center text-[9.5px] leading-relaxed text-muted/60">
          {adminMode
            ? "Admin credentials are issued by the programme lead. Students should use the student sign-in."
            : "The admin console is limited to the administrator account."}
        </p>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.07]" />
        <span className="text-[9.5px] uppercase tracking-[0.14em] text-muted/60">New here</span>
        <div className="h-px flex-1 bg-white/[0.07]" />
      </div>

      <Link href="/signup" className="btn btn-dark mt-4 w-full">Create a free account</Link>

      <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-muted/60">
        <ShieldCheck size={11} /> Guardian-verified access · No real money, ever
      </div>
    </div>
  );
}

export function SignupForm() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", mode: "student", region: "IN", dob: "", guardianEmail: "",
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const minor = useMemo(() => {
    if (!form.dob) return false;
    const age = (Date.now() - new Date(form.dob).getTime()) / (365.25 * 24 * 3600 * 1000);
    return age < 18;
  }, [form.dob]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreed) { setError("Accept the simulation terms to continue."); return; }
    if (minor && !form.guardianEmail) { setError("A guardian email is required for learners under 18."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to create your account.");
      window.location.assign(data.redirect ?? "/dashboard");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="eyebrow">Create account</div>
      <h2 className="mt-2 text-[26px] font-semibold tracking-tight">Start with 100 credits</h2>
      <p className="mt-1.5 text-[12.5px] text-muted">Choose a learner mode and region. You can switch both later.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-xl border border-[rgba(255,93,122,.25)] bg-[rgba(255,93,122,.08)] px-3.5 py-2.5 text-[11.5px] text-[#ffb3c0]">{error}</div>
        )}

        <Field icon={<User size={15} />} label="Full name" placeholder="Aarav Mehta" value={form.name}
          onChange={(e) => set("name", e.target.value)} required autoComplete="name" />
        <Field icon={<Mail size={15} />} label="Email" type="email" placeholder="you@example.com" value={form.email}
          onChange={(e) => set("email", e.target.value)} required autoComplete="email" />
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70"><Lock size={15} /></span>
            <input type={show ? "text" : "password"} className="input pl-10 pr-10" placeholder="At least 8 characters"
              value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} autoComplete="new-password" />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label="Toggle password">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Learner mode</label>
          <div className="grid grid-cols-2 gap-1.5">
            {MODES.map((m) => (
              <button key={m.id} type="button" onClick={() => set("mode", m.id)}
                className={cn("rounded-lg border px-2.5 py-2 text-left transition",
                  form.mode === m.id ? "border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.08)]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/15")}>
                <div className={cn("text-[10.5px] font-semibold", form.mode === m.id ? "text-[#8df5d0]" : "text-[#c9d2e2]")}>{m.name}</div>
                <div className="mt-0.5 text-[8.5px] text-muted">{m.tagline}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Region</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[["IN", "India", "₹"], ["US", "USA", "$"]].map(([id, label, sym]) => (
                <button key={id} type="button" onClick={() => set("region", id)}
                  className={cn("flex h-[44px] flex-col items-center justify-center rounded-lg border transition",
                    form.region === id ? "border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.08)] text-[#8df5d0]" : "border-white/[0.07] bg-white/[0.02] text-muted")}>
                  <span className="text-[10.5px] font-semibold">{sym} {label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Date of birth</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70"><Calendar size={15} /></span>
              <input type="date" className="input pl-10" value={form.dob} onChange={(e) => set("dob", e.target.value)} required />
            </div>
          </div>
        </div>

        {minor && (
          <div className="animate-fade-in">
            <Field icon={<Users size={15} />} label="Guardian email (required under 18)" type="email" placeholder="parent@example.com"
              value={form.guardianEmail} onChange={(e) => set("guardianEmail", e.target.value)} required />
            <p className="mt-1.5 text-[9.5px] text-muted/70">Your guardian approves simulated trading access during verification.</p>
          </div>
        )}

        <button type="button" onClick={() => setAgreed((v) => !v)} className="flex items-start gap-2.5 text-left">
          <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
            agreed ? "border-[#2fe3a0] bg-[#2fe3a0] text-[#04140d]" : "border-white/20 bg-white/[0.03]")}>
            {agreed && <Check size={11} strokeWidth={3} />}
          </span>
          <span className="text-[10px] leading-relaxed text-muted">
            I understand this is a simulation. No real capital is at risk, and no output here is financial advice.
          </span>
        </button>
        <p className="text-[9.5px] leading-relaxed text-muted/60">
          Read the{" "}
          <Link href="/legal#simulation-terms" className="text-[#8df5d0] underline-offset-2 hover:underline">simulation terms</Link>,{" "}
          <Link href="/legal#privacy" className="text-[#8df5d0] underline-offset-2 hover:underline">privacy notice</Link>,{" "}
          <Link href="/legal#guardian-policy" className="text-[#8df5d0] underline-offset-2 hover:underline">guardian policy</Link>{" "}
          and{" "}
          <Link href="/legal#risk-disclosure" className="text-[#8df5d0] underline-offset-2 hover:underline">risk disclosure</Link>.
        </p>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Creating account…" : "Create account"} {!loading && <ArrowRight size={15} />}
        </button>

        <div className="flex items-center gap-3 pt-1">
          <div className="h-px flex-1 bg-white/[0.07]" />
          <span className="text-[9.5px] uppercase tracking-[0.14em] text-muted/60">or</span>
          <div className="h-px flex-1 bg-white/[0.07]" />
        </div>

        <GoogleButton
          intent="signup"
          label="Sign up with Google"
          requireTerms
          termsAccepted={agreed}
          onError={setError}
          profile={{
            name: form.name || undefined,
            mode: form.mode,
            region: form.region,
            dob: form.dob || undefined,
            guardianEmail: form.guardianEmail || undefined,
          }}
        />
        <p className="text-center text-[9.5px] leading-relaxed text-muted/60">
          Google verifies your email only. The ID document check is still required before you trade.
        </p>
      </form>

      <p className="mt-5 text-center text-[11px] text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-[#5beeb9] hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
