import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Code2, Cpu, Database, GraduationCap,
  Languages, Layers, Lightbulb, LineChart, Radio, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { Wordmark } from "./logo";
import { Badge } from "./ui";

const CONTRIBUTIONS = [
  {
    icon: Code2,
    title: "Product & front end",
    body: "Every screen, component and interaction — designed and built from scratch on Next.js and React.",
  },
  {
    icon: Radio,
    title: "Real-time market engine",
    body: "A live tape of 31 instruments across India and the US, priced continuously by a simulation engine.",
  },
  {
    icon: LineChart,
    title: "Trade terminal",
    body: "Orders, spreads, brokerage, slippage and tax — every cost shown before a trade is committed.",
  },
  {
    icon: ShieldCheck,
    title: "Identity & guardian consent",
    body: "Document checks for minors, with a shareable guardian approval link and a full consent trail.",
  },
  {
    icon: Users,
    title: "Institutional console",
    body: "Classrooms, join codes, cohort analytics and per-account access granted by the administrator.",
  },
  {
    icon: Languages,
    title: "Four-language experience",
    body: "English, Hindi, Tamil and Arabic — including right-to-left layout for Arabic.",
  },
];

const STATS = [
  ["31", "Live instruments"],
  ["5", "Asset classes"],
  ["2", "Markets"],
  ["4", "Languages"],
];

const STACK = [
  "Next.js 15", "React 19", "Node 24", "Socket.IO", "SQLite", "Tesseract OCR", "Firebase Auth", "Docker",
];

export function Developers() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[620px]"
        style={{ background: "radial-gradient(60% 100% at 50% -20%, rgba(47,227,160,.12), transparent 70%)" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] grid-bg opacity-35" />

      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#06080d]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[66px] max-w-[1120px] items-center gap-4 px-5">
          <Link href="/" className="shrink-0"><Wordmark /></Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium text-muted transition hover:bg-white/[0.04] hover:text-ink">
              <ArrowLeft size={13} /> Back to site
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm">Get started <ArrowRight size={13} /></Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-[1120px] px-5 pb-12 pt-[118px] sm:pt-[136px]">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5beeb9]">
          <span className="h-px w-8 bg-[#2fe3a0]/50" /> The team
        </div>

        <h1 className="mt-6 max-w-[960px] bg-gradient-to-br from-[#f4fffb] via-[#dbfff1] to-[#2fe3a0] bg-clip-text text-[clamp(46px,9.5vw,112px)] font-semibold leading-[0.92] tracking-[-0.055em] text-transparent">
          Pranav Ramsingh
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="chip chip-green"><Sparkles size={10} /> Lead Developer</span>
          <span className="text-[12px] text-muted">Built the platform, the market engine and the core experience.</span>
        </div>

        <p className="mt-6 max-w-[680px] text-[14.5px] leading-relaxed text-[#c9d2e2] sm:text-[15.5px]">
          Designed and developed MockTrade Matrix end to end — the product, the real-time market engine,
          identity verification, the institutional console, reporting and the four-language experience.
        </p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {["Product design", "Full-stack engineering", "Realtime systems", "Trust & safety"].map((tag) => (
            <span key={tag} className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[10px] text-muted">{tag}</span>
          ))}
        </div>
      </section>

      {/* stats */}
      <section className="relative z-10 border-y border-white/[0.055] bg-[#070a10]/50">
        <div className="mx-auto grid max-w-[1120px] grid-cols-2 divide-white/[0.06] px-5 sm:grid-cols-4 sm:divide-x">
          {STATS.map(([value, label], index) => (
            <div key={label} className={`py-6 sm:px-6 ${index > 1 ? "border-t border-white/[0.06] sm:border-t-0" : ""} ${index % 2 === 1 ? "pl-5 sm:pl-6" : ""}`}>
              <div className="num text-[26px] font-semibold leading-none text-[#eafff7]">{value}</div>
              <div className="mt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* build + concept */}
      <section className="relative z-10 mx-auto max-w-[1120px] px-5 py-16 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              <Layers size={12} className="text-[#5beeb9]" /> What was built
            </div>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] sm:text-[32px]">A live simulation, not a mock-up.</h2>
          </div>
          <p className="max-w-[340px] text-[11.5px] leading-relaxed text-muted">
            Product, engine, trust layer and classroom tooling — built and shipped as one system.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.42fr_.58fr]">
          <div className="card p-6 sm:p-7">
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {CONTRIBUTIONS.map((item, index) => (
                <div key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(47,227,160,.16)] bg-[rgba(47,227,160,.05)] text-[#5beeb9]">
                    <item.icon size={14} />
                  </span>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="num text-[8.5px] font-semibold text-muted/50">{String(index + 1).padStart(2, "0")}</span>
                      <div className="text-[12.5px] font-semibold text-[#eafff7]">{item.title}</div>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card relative flex flex-col overflow-hidden p-6 sm:p-7">
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(80% 60% at 100% 0%, rgba(255,192,97,.1), transparent 70%)" }} />
            <div className="relative flex flex-1 flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffd08d]">
                  <Lightbulb size={12} /> Concept
                </div>
                <Badge tone="amber">Origin</Badge>
              </div>

              <div className="mt-7 text-[clamp(32px,4.4vw,46px)] font-semibold leading-[0.95] tracking-[-0.045em] text-[#fff4dd]">
                Madhavan KS
              </div>
              <div className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#ffd08d]/80">Core idea</div>

              <p className="mt-5 text-[12px] leading-relaxed text-[#c9bda8]">
                The original idea behind MockTrade Matrix. The insight that students should feel market
                risk before they ever risk real money came from him.
              </p>

              <div className="mt-auto pt-7">
                <div className="flex items-center gap-2 rounded-xl border border-[rgba(255,192,97,.16)] bg-[rgba(255,192,97,.05)] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#ffd08d]">
                  <GraduationCap size={13} className="shrink-0" /> Learning by living through the risk.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* stack */}
      <section className="relative z-10 border-y border-white/[0.055] bg-[#070a10]/60">
        <div className="mx-auto max-w-[1120px] px-5 py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="shrink-0">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                <Cpu size={12} className="text-[#5beeb9]" /> Under the hood
              </div>
              <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">The stack that runs the matrix.</h2>
            </div>
            <div className="flex max-w-[560px] flex-wrap gap-1.5 sm:justify-end">
              {STACK.map((tech) => (
                <span key={tech} className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[10px] font-medium text-[#b9c2d2]">{tech}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-[1120px] px-5 py-16">
        <div className="card relative overflow-hidden p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 100% at 50% 0%, rgba(47,227,160,.1), transparent 70%)" }} />
          <div className="relative">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.08)]">
              <Database size={20} className="text-[#5beeb9]" />
            </div>
            <h2 className="mx-auto mt-5 max-w-xl text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
              Learn to lose. Before it costs anything.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[12.5px] leading-relaxed text-muted">
              Open the live simulation and see what the team built — 31 instruments, two markets and zero real capital at risk.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className="btn btn-primary btn-lg">Try the simulation <ArrowUpRight size={15} /></Link>
              <Link href="/" className="btn btn-ghost btn-lg">Back to home</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.055]">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[10px] text-muted/60">
          <span>© {new Date().getFullYear()} MockTrade Matrix. A simulation — not investment advice.</span>
          <div className="flex items-center gap-3">
            <Link href="/developers" className="transition hover:text-ink">Developers</Link>
            <Link href="/legal" className="transition hover:text-ink">Legal</Link>
            <span>SDG 4 · SDG 8 · SDG 12</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
