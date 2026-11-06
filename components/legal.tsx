import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Ban, BookOpen, CheckCircle2,
  CreditCard, Database, FileText, Globe2, Info, Languages, Lock, Mail,
  Map, RefreshCw, Scale, ShieldCheck, Sparkles, UserCheck, Users,
} from "lucide-react";
import { Wordmark } from "./logo";
import { Badge } from "./ui";

const UPDATED = "3 November 2026";

// Opens Gmail's compose window with the public contact address pre-filled.
const CONTACT_EMAIL = "mocktradematrix@gmail.com";
const GMAIL_COMPOSE = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}`;

const TOC: Array<[string, string]> = [
  ["simulation-terms", "Simulation terms"],
  ["privacy", "Privacy notice"],
  ["guardian-policy", "Guardian policy"],
  ["risk-disclosure", "Risk disclosure"],
  ["pricing", "Plans & access"],
  ["about", "About the project"],
  ["roadmap", "Roadmap"],
  ["contact", "Contact"],
  ["sdg", "SDG alignment"],
  ["changes", "Changes & notices"],
];

const FACTS = [
  {
    icon: ShieldCheck,
    title: "Zero real capital",
    body: "No deposits, withdrawals, brokerage accounts or securities. Every balance is virtual.",
  },
  {
    icon: Database,
    title: "Simulated prices",
    body: "All 31 instruments are priced by our own engine, not by an exchange feed.",
  },
  {
    icon: UserCheck,
    title: "Consent first",
    body: "Learners under 18 need a guardian to approve before simulated trading opens.",
  },
  {
    icon: Scale,
    title: "Not advice",
    body: "Nothing here is a recommendation, forecast, offer or solicitation.",
  },
];

function Note({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "amber";
}) {
  const styles =
    tone === "amber"
      ? "border-[rgba(255,192,97,.2)] bg-[rgba(255,192,97,.05)] text-[#ffd08d]"
      : "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.05)] text-[#bdf7e2]";
  return (
    <div className={`mt-5 flex gap-2.5 rounded-xl border px-3.5 py-3 text-[11px] leading-relaxed ${styles}`}>
      <Info size={14} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function Entry({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] px-3.5 py-3">
      <div className="text-[11.5px] font-semibold text-[#eafff7]">{title}</div>
      <div className="mt-1 text-[11.5px] leading-relaxed text-muted">{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#2fe3a0]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({
  id, n, icon: Icon, title, lead, children,
}: {
  id: string;
  n: string;
  icon: React.ElementType;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-white/[0.06] py-9 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.06)] text-[10.5px] font-bold text-[#8df5d0]">
          {n}
        </span>
        <div>
          <div className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#5beeb9]">
            <Icon size={11} /> Disclosure
          </div>
          <h2 className="mt-1 text-[21px] font-semibold tracking-[-0.025em] sm:text-[25px]">{title}</h2>
          {lead && <p className="mt-2 max-w-[700px] text-[12px] leading-relaxed text-muted">{lead}</p>}
        </div>
      </div>
      <div className="mt-5 space-y-4 text-[12px] leading-relaxed text-[#b9c2d2] sm:pl-[44px]">{children}</div>
    </section>
  );
}

export function Legal() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[620px]"
        style={{ background: "radial-gradient(60% 100% at 50% -20%, rgba(47,227,160,.1), transparent 70%)" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] grid-bg opacity-30" />

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
      <section className="relative z-10 mx-auto max-w-[1120px] px-5 pb-10 pt-[118px] sm:pt-[136px]">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5beeb9]">
          <span className="h-px w-8 bg-[#2fe3a0]/50" /> Legal & disclosures
        </div>

        <h1 className="mt-5 max-w-[860px] bg-gradient-to-br from-[#f4fffb] via-[#dbfff1] to-[#2fe3a0] bg-clip-text text-[clamp(38px,7vw,76px)] font-semibold leading-[0.95] tracking-[-0.05em] text-transparent">
          The fine print, without the fog.
        </h1>

        <p className="mt-5 max-w-[680px] text-[14px] leading-relaxed text-[#c9d2e2]">
          Every claim on this site, explained in one place: what is simulated, what data we hold,
          how guardian consent works, and why nothing here is investment advice.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge tone="green"><CheckCircle2 size={10} /> Last updated {UPDATED}</Badge>
          <Badge tone="neutral"><Globe2 size={10} /> India & United States</Badge>
          <Badge tone="amber"><AlertTriangle size={10} /> Simulation only</Badge>
        </div>
      </section>

      {/* quick facts */}
      <section className="relative z-10 border-y border-white/[0.055] bg-[#070a10]/50">
        <div className="mx-auto grid max-w-[1120px] gap-px px-5 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.title} className="py-3 sm:px-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(47,227,160,.16)] bg-[rgba(47,227,160,.05)] text-[#5beeb9]">
                <fact.icon size={14} />
              </span>
              <div className="mt-2.5 text-[12px] font-semibold text-[#eafff7]">{fact.title}</div>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{fact.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* body */}
      <div className="relative z-10 mx-auto max-w-[1120px] px-5 py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          {/* contents */}
          <aside className="lg:sticky lg:top-[86px] lg:self-start">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">
                <FileText size={11} /> On this page
              </div>
              <nav className="mt-3 space-y-1">
                {TOC.map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="block rounded-md px-2 py-1.5 text-[11px] text-muted transition hover:bg-white/[0.04] hover:text-ink"
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 border-t border-white/[0.06] pt-3 text-[9.5px] leading-relaxed text-muted/70">
                Published in English. Where a translation is shown, the English version controls.
              </div>
            </div>
          </aside>

          {/* sections */}
          <article className="min-w-0">
            <Section
              id="simulation-terms"
              n="01"
              icon={Ban}
              title="Simulation terms"
              lead="MockTrade Matrix is an educational markets simulator. Creating an account opens a practice environment — not a brokerage account, deposit account or investment product."
            >
              <Bullets
                items={[
                  <><strong className="text-ink">Virtual capital.</strong> Every learner starts with virtual money — ₹1,00,000 in India or $10,000 in the United States, plus a separate crypto sandbox balance. Virtual cash cannot be deposited, withdrawn, transferred, converted or paid out.</>,
                  <><strong className="text-ink">Simulated orders only.</strong> Trades are filled by our simulation engine at simulated prices, with modelled spread, brokerage, slippage and taxes. No order reaches an exchange, broker, counterparty or real asset.</>,
                  <><strong className="text-ink">Credits and powerups.</strong> Credits are earned through learning, quizzes and arena wins, and are spent on virtual capital packs and quiz powerups. Credits cannot be bought with money, sold, transferred or redeemed for cash, and may be adjusted or reset if a technical error or abuse is detected.</>,
                  <><strong className="text-ink">The quiz arena.</strong> Matches are free to enter, skill-based and five questions long. Matchmaking is global: opponents are paired by skill rating, never by country, so you can meet a learner anywhere in the world. The quiz leaderboards are presented region by region (for example Oman, the wider Middle East, Europe or South Asia). Winners earn credits; losers and draws earn none. There is no entry fee and no real-world prize.</>,
                  <><strong className="text-ink">One account per person.</strong> Do not share credentials, run bots or scripts, collude, exploit bugs or scrape the service. Accounts may be warned, reset or suspended to protect the simulation and other learners.</>,
                  <><strong className="text-ink">Availability.</strong> The service is provided as-is for education. Features may change, pause or reset, and uptime and data permanence are not guaranteed.</>,
                  <><strong className="text-ink">Intellectual property.</strong> The name, interface, question bank, engine and written content belong to the project. Do not copy, resell or redistribute them without permission.</>,
                  <><strong className="text-ink">Changes.</strong> If these terms change materially, the updated page is published here and, where appropriate, noted in-app. Continuing to use the service means accepting the updated terms.</>,
                ]}
              />
              <Note>
                Plain English, not a loophole: if anything on this page conflicts with mandatory consumer law
                in your country, the law prevails over this page.
              </Note>
            </Section>

            <Section
              id="privacy"
              n="02"
              icon={Lock}
              title="Privacy notice"
              lead="We collect the smallest set of data needed to run a verified simulation, and we do not sell it."
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Entry title="Account data">
                  Name, email, password hash, learner mode, region, optional date of birth, optional guardian
                  email, and avatar initials.
                </Entry>
                <Entry title="Verification data">
                  Document type, the name and address read from the document, a one-way hash of the image,
                  a confidence score, and pass/fail checks. The image itself is deleted immediately after
                  it is read.
                </Entry>
                <Entry title="Activity data">
                  Simulated orders, holdings, quiz answers, arena results, credits, XP, notifications and
                  settings. Leaderboards show your display name, region and results.
                </Entry>
                <Entry title="Technical data">
                  A signed session cookie, your language preference in your browser, and ordinary server
                  logs needed for security and debugging.
                </Entry>
              </div>

              <p>
                <strong className="text-ink">Why we hold it.</strong> To operate your account, verify that the
                name and address on your document match the account, record guardian consent where required,
                rank leaderboards, prevent abuse, and answer support requests.
              </p>
              <p>
                <strong className="text-ink">Cookies and tracking.</strong> One session cookie keeps you signed
                in; your language choice is stored locally in your browser. There are no advertising trackers
                and no profile sale.
              </p>
              <p>
                <strong className="text-ink">Third parties.</strong> Google sign-in is handled by Firebase if you
                choose it, and network transport may pass through a hosting or tunnel provider. The document
                reader runs locally on our server. We do not sell personal data.
              </p>
              <p>
                <strong className="text-ink">Retention.</strong> Account data is kept while the account is
                active. Verification records are kept for integrity and audit. Server logs are short-lived.
                Deletion requests are honoured unless a record must be kept for fraud prevention or a legal
                obligation.
              </p>
              <p>
                <strong className="text-ink">Your choices.</strong> You can correct your name, region, mode and
                accent in Settings, ask for a copy of your data, or ask for deletion by contacting us. A
                guardian can withdraw consent at any time.
              </p>
              <p>
                <strong className="text-ink">Security.</strong> Passwords are hashed, access checks run on the
                server, uploads are rate-limited, and document images are not retained. No system is perfectly
                secure, so report anything suspicious.
              </p>
              <Note tone="amber">
                We never ask for card details, bank credentials, broker logins or one-time passwords. There is
                no real money in this product, so there is nothing of that kind to steal.
              </Note>
            </Section>

            <Section
              id="guardian-policy"
              n="03"
              icon={Users}
              title="Guardian & minor policy"
              lead="Learners under 18 can explore the simulation, but a guardian must approve before simulated capital is committed."
            >
              <Bullets
                items={[
                  <><strong className="text-ink">Who counts as a minor.</strong> Anyone under 18 on the date of sign-up, based on the date of birth provided.</>,
                  <><strong className="text-ink">What we require.</strong> A guardian email at sign-up and a unique consent link emailed to that address. The guardian sees the learner&apos;s name, learner mode, region and request date, and can approve or decline.</>,
                  <><strong className="text-ink">What the guardian approves.</strong> Use of an educational simulation with virtual money only, and processing of the learner&apos;s account and verification data as described in the privacy notice.</>,
                  <><strong className="text-ink">When consent is needed.</strong> Identity verification and guardian approval are required before simulated capital is committed — that is, before trading and before buying capital packs or powerups.</>,
                  <><strong className="text-ink">Withdrawal.</strong> A guardian can revoke consent at any time. Trading and shop purchases pause immediately; learning and reading remain available where possible.</>,
                  <><strong className="text-ink">Re-approval.</strong> The learner can resend the consent email if it was missed, declined or withdrawn.</>,
                  <><strong className="text-ink">Keep the link private.</strong> The guardian link is single-purpose. Do not post it publicly or forward it to people who are not the learner&apos;s guardian.</>,
                ]}
              />
              <Note>
                Guardians can contact <a href={GMAIL_COMPOSE} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#8df5d0] underline-offset-2 hover:underline">mocktradematrix@gmail.com</a>{" "}
                to ask what data is held, withdraw consent, or request deletion of a learner&apos;s account.
              </Note>
            </Section>

            <Section
              id="risk-disclosure"
              n="04"
              icon={AlertTriangle}
              title="Risk disclosure"
              lead="A simulation is a teaching tool. It is not the market, and it cannot tell you what will happen in one."
            >
              <Bullets
                items={[
                  <><strong className="text-ink">Synthetic markets.</strong> Prices, volatility and news are generated by our engine. Crash drills are scheduled at random gaps of roughly 2 days to 2 weeks, so no result here predicts a real outcome.</>,
                  <><strong className="text-ink">No advice or recommendation.</strong> Nothing on the platform is a recommendation, forecast, offer or solicitation. There is no broker, dealer, adviser or fiduciary relationship, and no suitability assessment.</>,
                  <><strong className="text-ink">Rewards are not returns.</strong> Credits, XP, streaks and leaderboards measure engagement in an educational game. They are not investment skill, creditworthiness or a promise of performance.</>,
                  <><strong className="text-ink">Behavioural index is educational.</strong> It summarises your simulated decisions for reflection. It is not a psychological diagnosis, credit score or employment record.</>,
                  <><strong className="text-ink">Data and availability risk.</strong> The simulation may be reset, interrupted by maintenance, or affected by bugs. History can be lost.</>,
                  <><strong className="text-ink">Third-party links.</strong> External sites are outside our control and are governed by their own terms and privacy policies.</>,
                  <><strong className="text-ink">Limitation of liability.</strong> To the extent permitted by law, the project is not liable for indirect or incidental losses arising from use of the service. Nothing here limits rights that cannot lawfully be waived.</>,
                ]}
              />
              <Note tone="amber">
                If you are making a real financial decision, speak to a licensed professional. If you are in
                crisis, contact local emergency or support services. This platform is not a substitute for either.
              </Note>
            </Section>

            <Section
              id="pricing"
              n="05"
              icon={CreditCard}
              title="Plans & institutional access"
              lead="Learner access is free. Educator and institution plans are quoted for classroom deployments — and this build does not take card payments."
            >
              <div className="grid gap-2.5 sm:grid-cols-3">
                <Entry title="Learner">Free. Full simulation, modules, arena and leaderboards.</Entry>
                <Entry title="Educator — ₹599 / month">Single teacher running one class, with classroom tools.</Entry>
                <Entry title="Institution — ₹2,499 / seat / month">Billed monthly, no annual commitment, with cohort analytics and priority support.</Entry>
              </div>
              <p>
                <strong className="text-ink">How access is granted.</strong> The institutional console is enabled
                per account by the platform administrator, matched to the email on the account. It is not
                self-service and cannot be unlocked from the client.
              </p>
              <p>
                <strong className="text-ink">Payments.</strong> This deployment does not process card payments,
                subscriptions, invoices or renewals inside the app. If billing is enabled later, prices, taxes,
                renewal and cancellation terms will be shown before any payment is requested.
              </p>
              <p>
                <strong className="text-ink">Refunds.</strong> Because no payment is collected in this build,
                there is nothing to refund. Any future paid plan will state its refund policy before checkout.
              </p>
            </Section>

            <Section
              id="about"
              n="06"
              icon={BookOpen}
              title="About the project"
              lead="A guardian-verified, real-time financial literacy and investment simulation built for India and the United States."
            >
              <p>
                The live build covers 31 simulated instruments across five asset classes and two regions —
                16 stocks, 4 crypto assets, 4 ETFs, 4 funds and 3 insurance products — plus eight learning
                modules, scheduled crash drills, a global skill-based 1v1 quiz arena, region-wise leaderboards and a
                portfolio report you can export.
              </p>
              <p>
                It runs in English, Hindi, Tamil and Arabic, including right-to-left layout for Arabic.
                Identity verification checks that the name and address on a real document match the account,
                and minors need guardian approval before simulated capital is committed.
              </p>
              <p>
                <strong className="text-ink">Team.</strong> Pranav Ramsingh is the lead developer; Madhavan KS
                created the core idea that students should feel market risk before they ever risk real money.
                The full credit list is on the{" "}
                <Link href="/developers" className="font-semibold text-[#8df5d0] underline-offset-2 hover:underline">
                  Developers page
                </Link>.
              </p>
              <p>
                <strong className="text-ink">Independence.</strong> MockTrade Matrix is an independent
                educational project. It is not affiliated with, endorsed by or connected to any exchange,
                broker, bank, regulator or the United Nations. Instrument names and symbols are used for
                identification only.
              </p>
            </Section>

            <Section
              id="roadmap"
              n="07"
              icon={Map}
              title="Roadmap"
              lead="What is live now, what is planned next, and what is deliberately out of scope."
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Entry title="Live now">
                  Simulation engine, trade terminal, portfolio and report export, identity verification,
                  guardian consent, institution console, four languages, crash drills, quiz arena and
                  leaderboards.
                </Entry>
                <Entry title="Planned next">
                  Always-on named hosting, classroom competition scheduling, richer report exports, an
                  accessibility pass, mobile refinements and a larger question bank. These are intentions,
                  not dated commitments.
                </Entry>
              </div>
              <p>
                <strong className="text-ink">Deliberately out of scope.</strong> Real-money deposits,
                withdrawals, live brokerage connectivity, real securities, and cash payouts for credits or
                leaderboard positions. Those are not features waiting to be switched on — they are outside
                what this product is.
              </p>
            </Section>

            <Section
              id="contact"
              n="08"
              icon={Mail}
              title="Contact"
              lead="One address for privacy, guardian, access and security questions."
            >
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  <Mail size={12} className="text-[#5beeb9]" /> Platform administrator
                </div>
                <a
                  href={GMAIL_COMPOSE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 block text-[15px] font-semibold text-[#8df5d0] underline-offset-2 hover:underline"
                >
                  mocktradematrix@gmail.com
                </a>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  Use this address for data access or deletion, guardian consent withdrawal, institutional
                  access, bug reports and security disclosures. We aim to respond within a reasonable period.
                </p>
              </div>
              <p>
                <strong className="text-ink">Security reports.</strong> Please report vulnerabilities privately
                and do not test against another learner&apos;s account or data. Include steps to reproduce and
                the account you used.
              </p>
            </Section>

            <Section
              id="sdg"
              n="09"
              icon={Languages}
              title="SDG alignment"
              lead="The three Sustainable Development Goals referenced in the footer, and what they mean here."
            >
              <div className="space-y-2.5">
                <Entry title="SDG 4 — Quality education">
                  A free learner tier, structured modules and four languages lower the barrier to financial
                  literacy.
                </Entry>
                <Entry title="SDG 8 — Decent work and economic growth">
                  Market mechanics, costs, taxes and behavioural reflection build practical financial capability.
                </Entry>
                <Entry title="SDG 12 — Responsible consumption and production">
                  Crash drills and full cost disclosure teach restraint and responsible risk-taking, with zero
                  real capital at risk.
                </Entry>
              </div>
              <Note>
                These are alignment statements about the project&apos;s educational aims. They are not a
                certification, partnership or endorsement by the United Nations.
              </Note>
            </Section>

            <Section
              id="changes"
              n="10"
              icon={RefreshCw}
              title="Changes, version & notices"
              lead="How this page is maintained, and which version applies."
            >
              <Bullets
                items={[
                  <><strong className="text-ink">Version 1.0.</strong> Effective {UPDATED}.</>,
                  <><strong className="text-ink">Language.</strong> This page is published in English. Where the interface is translated, the English version of these disclosures controls.</>,
                  <><strong className="text-ink">No legal entity implied.</strong> MockTrade Matrix is an independent educational project. This page does not create a company, partnership, trust or regulated financial entity, and it is not itself legal advice.</>,
                  <><strong className="text-ink">Severability.</strong> If a provision is unenforceable in your country, it is limited to the minimum extent necessary and the remaining provisions stay in force.</>,
                  <><strong className="text-ink">Contact for notices.</strong> Legal and privacy notices can be sent to <a href={GMAIL_COMPOSE} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#8df5d0] underline-offset-2 hover:underline">mocktradematrix@gmail.com</a>.</>,
                ]}
              />
              <Note>
                Read this together with the in-app confirmation you accept at sign-up and at verification.
                Those confirmations are a short summary; this page is the full explanation.
              </Note>
            </Section>
          </article>
        </div>
      </div>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-[1120px] px-5 pb-14">
        <div className="card relative overflow-hidden p-7 sm:p-10">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 100% at 50% 0%, rgba(47,227,160,.09), transparent 70%)" }} />
          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5beeb9]">
                <Sparkles size={11} /> Still clear?
              </div>
              <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.03em] sm:text-[26px]">
                If something is unclear, ask before you sign up.
              </h2>
              <p className="mt-2 max-w-[560px] text-[11.5px] leading-relaxed text-muted">
                Every rule above is enforced in the product. If a claim here does not match what you see,
                write to us so it can be fixed.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a href={GMAIL_COMPOSE} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Email us</a>
              <Link href="/signup" className="btn btn-primary">Create free account <ArrowUpRight size={13} /></Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.055]">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[10px] text-muted/60">
          <span>© {new Date().getFullYear()} MockTrade Matrix. A simulation — not investment advice.</span>
          <div className="flex items-center gap-3">
            <Link href="/" className="transition hover:text-ink">Home</Link>
            <Link href="/developers" className="transition hover:text-ink">Developers</Link>
            <a href="#simulation-terms" className="transition hover:text-ink">Back to top</a>
            <span>SDG 4 · SDG 8 · SDG 12</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
