import Link from "next/link";
import {
  ArrowDownRight, ArrowLeft, ArrowUpRight, BadgeCheck, Bitcoin, Coins, Receipt, ShieldCheck, Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { buildPortfolioReport } from "@/lib/report";
import { fmtMoney, fmtPct, fmtQty, levelFromXp, modeName } from "@/lib/finance";
import { ReportActions } from "@/components/report-actions";
import type { BehavioralComponent } from "@/lib/report-types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portfolio report — MockTrade Matrix",
  robots: { index: false, follow: false },
};

function scoreColor(score: number | null) {
  if (score === null) return "#94a3b8";
  if (score >= 70) return "#0f9d6b";
  if (score >= 50) return "#c2860f";
  return "#c2414b";
}

function Kpi({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "green" | "red" | "amber" }) {
  const colors: Record<string, string> = {
    neutral: "text-[#0b1220]",
    green: "text-[#0f9d6b]",
    red: "text-[#c2414b]",
    amber: "text-[#b7790a]",
  };
  return (
    <div className="rounded-xl border border-[#e6ebf2] bg-[#f8fafc] p-3">
      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#64748b]">{label}</div>
      <div className={`mt-1.5 text-[16px] font-semibold leading-tight ${colors[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-[#64748b]">{sub}</div>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 break-inside-avoid">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#e6ebf2] pb-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#334155]">{title}</h2>
        {subtitle && <span className="text-[10px] text-[#64748b]">{subtitle}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ComponentRow({ component }: { component: BehavioralComponent }) {
  return (
    <div className="break-inside-avoid">
      <div className="flex items-center justify-between gap-3 text-[12px] font-semibold">
        <span>{component.label}</span>
        <span style={{ color: scoreColor(component.score) }}>{component.score ?? "—"}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e8edf5]">
        <div
          className="h-full rounded-full"
          style={{ width: `${component.score ?? 0}%`, background: scoreColor(component.score) }}
        />
      </div>
      <div className="mt-1 text-[10px] leading-relaxed text-[#64748b]">
        {component.detail} · weight {Math.round(component.weight * 100)}%
      </div>
    </div>
  );
}

export default async function PortfolioReportPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  const user = await requireUser();
  const report = buildPortfolioReport(user);
  const { portfolio, behavioral } = report;
  const region = user.region;
  const sp = await searchParams;
  const rawFocus = Array.isArray(sp.symbol) ? sp.symbol[0] : sp.symbol;
  const focusSymbol = rawFocus ? rawFocus.toUpperCase() : null;
  const focusedPosition = focusSymbol
    ? portfolio.positions.find((p) => p.symbol === focusSymbol) ?? null
    : null;
  const level = levelFromXp(user.xp);
  const generated = new Date(report.generatedAt);
  const dateStamp = generated.toISOString().slice(0, 10);
  const reportId = `MTM-${user.id}-${dateStamp}`;
  const mainTotal = portfolio.total;
  const unrealisedPct = portfolio.invested > 0 ? (portfolio.unrealized / portfolio.invested) * 100 : 0;
  const weightOf = (value: number) => (portfolio.marketValue > 0 ? (value / portfolio.marketValue) * 100 : 0);

  return (
    <div className="min-h-screen bg-[#06080d] px-3 py-5 sm:px-6 sm:py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[1040px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/portfolio" className="btn btn-dark btn-sm">
          <ArrowLeft size={13} /> Back to portfolio
        </Link>
        <ReportActions />
      </div>

      <main className="mx-auto w-full max-w-[1040px] rounded-2xl border border-white/10 bg-white p-5 text-[#0b1220] shadow-2xl sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6ebf2] pb-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f9d6b]">
              MockTrade Matrix · Simulation report
            </div>
            <h1 className="mt-1 text-[24px] font-semibold tracking-tight sm:text-[30px]">
              Portfolio &amp; behavioural report
            </h1>
            <div className="mt-2 text-[12px] leading-relaxed text-[#5b6a82]">
              <strong className="text-[#0b1220]">{user.name}</strong> · {user.email}
              <br />
              {region === "IN" ? "India (INR)" : "United States (USD)"} · {modeName(user.mode)} · Level {level.level} ·{" "}
              {user.id_verified ? (
                <span className="inline-flex items-center gap-1 text-[#0f9d6b]"><BadgeCheck size={12} /> Identity verified</span>
              ) : (
                <span className="text-[#b7790a]">Identity not verified</span>
              )}
            </div>
          </div>
          <div className="text-right text-[10.5px] leading-relaxed text-[#64748b]">
            <div className="uppercase tracking-[0.1em]">Generated</div>
            <div className="font-semibold text-[#0b1220]">
              {generated.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </div>
            <div className="mt-2 uppercase tracking-[0.1em]">Report ID</div>
            <div className="font-mono text-[10px] text-[#0b1220]">{reportId}</div>
          </div>
        </header>

        {focusedPosition && (
          <div className="mt-4 rounded-xl border border-[#b9ecd9] bg-[#f0fdf7] px-3 py-2 text-[11.5px] text-[#0f6b4d]">
            Focused position: <strong>{focusedPosition.symbol}</strong> · {focusedPosition.name} ·{" "}
            {fmtMoney(focusedPosition.value, region)} ({weightOf(focusedPosition.value).toFixed(1)}% of invested value).
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Kpi label="Main account" value={fmtMoney(mainTotal, region)} sub="Cash + market value" />
          <Kpi label="Invested" value={fmtMoney(portfolio.invested, region)} sub={`${portfolio.positions.length} open positions`} />
          <Kpi
            label="Unrealised P&L"
            value={`${portfolio.unrealized >= 0 ? "+" : ""}${fmtMoney(portfolio.unrealized, region)}`}
            sub={`${fmtPct(unrealisedPct)} on cost`}
            tone={portfolio.unrealized >= 0 ? "green" : "red"}
          />
          <Kpi
            label="Realised P&L"
            value={`${portfolio.realized >= 0 ? "+" : ""}${fmtMoney(portfolio.realized, region)}`}
            sub="After fees and tax"
            tone={portfolio.realized >= 0 ? "green" : "red"}
          />
          <Kpi label="Cash" value={fmtMoney(portfolio.cash, region)} sub={`${behavioral.metrics.cashPct.toFixed(1)}% of account`} tone="green" />
          <Kpi label="Crypto sandbox" value={fmtMoney(portfolio.cryptoValue, region)} sub={`Cash ${fmtMoney(portfolio.cryptoCash, region)}`} />
          <Kpi label="Fees + tax paid" value={fmtMoney(portfolio.feesPaid + portfolio.taxPaid, region)} sub={`${behavioral.metrics.orders} fills`} tone="amber" />
          <Kpi
            label="Leaderboard"
            value={report.rank ? `#${report.rank.rank}` : "Unranked"}
            sub={report.rank ? `${fmtPct(report.rank.returnPct)} on starting capital` : "No ranked return yet"}
            tone="green"
          />
        </div>

        <Section title="Behavioural index" subtitle="Derived only from your real simulated activity">
          <div className="flex flex-wrap items-center gap-5">
            <div
              className="relative h-[132px] w-[132px] shrink-0 rounded-full"
              style={{ background: `conic-gradient(${scoreColor(behavioral.score)} ${(behavioral.score ?? 0) * 3.6}deg, #e8edf5 0deg)` }}
            >
              <div className="absolute inset-[17px] flex flex-col items-center justify-center rounded-full bg-white">
                <span className="text-[30px] font-bold leading-none">{behavioral.score ?? "—"}</span>
                <span className="mt-1 text-[10px] text-[#64748b]">/ 100</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[19px] font-semibold" style={{ color: scoreColor(behavioral.score) }}>
                {behavioral.band}
              </div>
              <div className="mt-1 text-[11.5px] text-[#5b6a82]">
                {behavioral.coverage}% signal coverage · missing signals are excluded, never estimated.
              </div>
              <div className="mt-3 grid gap-1 text-[11.5px] text-[#3d4a5f] sm:grid-cols-2">
                <div><strong>{behavioral.metrics.orders}</strong> fills · <strong>{behavioral.metrics.activeDays}</strong> active days</div>
                <div><strong>{behavioral.metrics.turnover.toFixed(1)}×</strong> starting-capital turnover</div>
                <div>Fees + tax <strong>{fmtMoney(behavioral.metrics.fees + behavioral.metrics.tax, region)}</strong> · <strong>{(behavioral.metrics.costRatio * 100).toFixed(2)}%</strong> of traded value</div>
                <div>Largest holding <strong>{behavioral.metrics.largestWeight.toFixed(1)}%</strong> · cash <strong>{behavioral.metrics.cashPct.toFixed(1)}%</strong></div>
                <div><strong>{behavioral.metrics.modulesDone}</strong> modules · avg quiz <strong>{behavioral.metrics.avgQuiz.toFixed(0)}%</strong></div>
                <div>Crash drill <strong>{behavioral.metrics.crashDone ? "completed" : "pending"}</strong> · <strong>{behavioral.metrics.streak}</strong>-day streak</div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {behavioral.components.map((c) => <ComponentRow key={c.key} component={c} />)}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {behavioral.highlights.map((h) => (
              <div key={h} className="rounded-lg border-l-[3px] border-[#0f9d6b] bg-[#f0fdf7] px-3 py-2 text-[11px] leading-relaxed text-[#0f6b4d]">
                {h}
              </div>
            ))}
            {behavioral.cautions.map((c) => (
              <div key={c} className="rounded-lg border-l-[3px] border-[#c2860f] bg-[#fffbeb] px-3 py-2 text-[11px] leading-relaxed text-[#8a5a06]">
                {c}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Analysis" subtitle="Plain-language read of the record above">
          <ul className="space-y-2">
            {report.analysis.map((line) => (
              <li key={line} className="flex gap-2 text-[12px] leading-relaxed text-[#334155]">
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f9d6b]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Allocation" subtitle="Main account, cash included">
          {portfolio.allocation.length === 0 ? (
            <p className="text-[12px] text-[#64748b]">No allocation yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {portfolio.allocation.map((a) => (
                <div key={a.key}>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="font-medium text-[#334155]">{a.label}</span>
                    <span className="text-[#64748b]">{fmtMoney(a.value, region)} · {a.pct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e8edf5]">
                    <div className="h-full rounded-full bg-[#0f9d6b]" style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Open positions" subtitle={`${portfolio.positions.length} main-account holdings`}>
          {portfolio.positions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#dbe2ec] px-4 py-6 text-center text-[12px] text-[#64748b]">
              No open positions. The main account is entirely in cash.
            </div>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[720px] border-collapse text-[11px] print:min-w-0">
                <thead>
                  <tr className="border-b border-[#e6ebf2] text-left text-[9px] uppercase tracking-[0.08em] text-[#64748b]">
                    <th className="px-1.5 py-2 font-semibold">Instrument</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Qty</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Avg cost</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Live</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Value</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Weight</th>
                    <th className="px-1.5 py-2 text-right font-semibold">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.positions.map((p) => (
                    <tr
                      key={p.symbol}
                      className={`border-b border-[#eef2f7] ${focusSymbol === p.symbol ? "bg-[#f0fdf7]" : ""}`}
                    >
                      <td className="px-1.5 py-2">
                        <div className="font-semibold">{p.symbol}</div>
                        <div className="text-[9.5px] text-[#64748b]">{p.name}</div>
                      </td>
                      <td className="px-1.5 py-2 text-right">{fmtQty(p.qty)}</td>
                      <td className="px-1.5 py-2 text-right">{fmtMoney(p.avgLocal, region)}</td>
                      <td className="px-1.5 py-2 text-right">{fmtMoney(p.priceLocal, region)}</td>
                      <td className="px-1.5 py-2 text-right font-semibold">{fmtMoney(p.value, region)}</td>
                      <td className="px-1.5 py-2 text-right">{weightOf(p.value).toFixed(1)}%</td>
                      <td className={`px-1.5 py-2 text-right font-semibold ${p.pnl >= 0 ? "text-[#0f9d6b]" : "text-[#c2414b]"}`}>
                        {p.pnl >= 0 ? "+" : ""}{fmtMoney(p.pnl, region)}
                        <div className="text-[9.5px] font-normal">{fmtPct(p.pnlPct)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Crypto sandbox" subtitle="Isolated capital">
          {portfolio.crypto.length === 0 ? (
            <p className="text-[12px] text-[#64748b]">No crypto exposure. The sandbox is empty.</p>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[620px] border-collapse text-[11px] print:min-w-0">
                <thead>
                  <tr className="border-b border-[#e6ebf2] text-left text-[9px] uppercase tracking-[0.08em] text-[#64748b]">
                    <th className="px-1.5 py-2 font-semibold">Instrument</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Qty</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Avg cost</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Live</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Value</th>
                    <th className="px-1.5 py-2 text-right font-semibold">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.crypto.map((p) => (
                    <tr key={p.symbol} className="border-b border-[#eef2f7]">
                      <td className="px-1.5 py-2">
                        <div className="font-semibold">{p.symbol}</div>
                        <div className="text-[9.5px] text-[#64748b]">{p.name}</div>
                      </td>
                      <td className="px-1.5 py-2 text-right">{fmtQty(p.qty)}</td>
                      <td className="px-1.5 py-2 text-right">{fmtMoney(p.avgLocal, region)}</td>
                      <td className="px-1.5 py-2 text-right">{fmtMoney(p.priceLocal, region)}</td>
                      <td className="px-1.5 py-2 text-right font-semibold">{fmtMoney(p.value, region)}</td>
                      <td className={`px-1.5 py-2 text-right font-semibold ${p.pnl >= 0 ? "text-[#0f9d6b]" : "text-[#c2414b]"}`}>
                        {p.pnl >= 0 ? "+" : ""}{fmtMoney(p.pnl, region)}
                        <div className="text-[9.5px] font-normal">{fmtPct(p.pnlPct)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Execution ledger" subtitle={`${report.orders.length} fills`}>
          {report.orders.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#dbe2ec] px-4 py-5 text-[12px] text-[#64748b]">
              <Receipt size={14} /> No executions yet.
            </div>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[760px] border-collapse text-[11px] print:min-w-0">
                <thead>
                  <tr className="border-b border-[#e6ebf2] text-left text-[9px] uppercase tracking-[0.08em] text-[#64748b]">
                    <th className="px-1.5 py-2 font-semibold">Time</th>
                    <th className="px-1.5 py-2 font-semibold">Side</th>
                    <th className="px-1.5 py-2 font-semibold">Instrument</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Qty</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Fill</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Notional</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Fee</th>
                    <th className="px-1.5 py-2 text-right font-semibold">Tax</th>
                    <th className="px-1.5 py-2 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {report.orders.map((o) => (
                    <tr key={o.id} className="border-b border-[#eef2f7]">
                      <td className="px-1.5 py-2 text-[#64748b]">
                        {new Date(o.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-1.5 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${o.side === "BUY" ? "bg-[#e8fbf2] text-[#0f9d6b]" : "bg-[#fdeef0] text-[#c2414b]"}`}>
                          {o.side}
                        </span>
                      </td>
                      <td className="px-1.5 py-2">
                        <div className="font-semibold">{o.symbol}</div>
                        <div className="text-[9.5px] text-[#64748b]">{o.name}</div>
                      </td>
                      <td className="px-1.5 py-2 text-right">{fmtQty(o.qty)}</td>
                      <td className="px-1.5 py-2 text-right">{fmtMoney(o.executed_price, region)}</td>
                      <td className="px-1.5 py-2 text-right">{fmtMoney(o.notional, region)}</td>
                      <td className="px-1.5 py-2 text-right text-[#b7790a]">{fmtMoney(o.fee, region)}</td>
                      <td className="px-1.5 py-2 text-right text-[#c2414b]">{o.tax > 0 ? fmtMoney(o.tax, region) : "—"}</td>
                      <td className="px-1.5 py-2 text-[9.5px] uppercase tracking-wide text-[#64748b]">{o.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Transactions" subtitle={`${report.transactions.length} cash & credit movements`}>
          {report.transactions.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#dbe2ec] px-4 py-5 text-[12px] text-[#64748b]">
              <Coins size={14} /> No transactions yet.
            </div>
          ) : (
            <div className="divide-y divide-[#eef2f7]">
              {report.transactions.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-2 py-2 text-[11px]">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${t.amount >= 0 ? "bg-[#e8fbf2] text-[#0f9d6b]" : "bg-[#fffbeb] text-[#b7790a]"}`}>
                    {t.amount >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#334155]">{t.note}</span>
                    <span className="block text-[9px] uppercase tracking-wide text-[#64748b]">
                      {t.kind.replace(/_/g, " ")} · {t.bucket}
                    </span>
                  </span>
                  <span className="text-[9.5px] text-[#64748b]">
                    {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className={`w-[90px] text-right font-semibold ${t.amount >= 0 ? "text-[#0f9d6b]" : "text-[#b7790a]"}`}>
                    {t.amount >= 0 ? "+" : ""}{t.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Mark-to-market history" subtitle="Current holdings, cash excluded">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e6ebf2] bg-[#f8fafc] px-4 py-3 text-[11.5px] text-[#475569]">
            <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-[#0f9d6b]" /> {report.history.points} points</span>
            <span className="text-[#cbd5e1]">·</span>
            <span>{report.history.first === null ? "—" : fmtMoney(report.history.first, region)} → {report.history.last === null ? "—" : fmtMoney(report.history.last, region)}</span>
            {report.history.changePct !== null && (
              <>
                <span className="text-[#cbd5e1]">·</span>
                <span className={report.history.changePct >= 0 ? "text-[#0f9d6b]" : "text-[#c2414b]"}>
                  {fmtPct(report.history.changePct)}
                </span>
              </>
            )}
          </div>
        </Section>

        <footer className="mt-7 border-t border-[#e6ebf2] pt-3 text-[10px] leading-relaxed text-[#64748b]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-[#0f9d6b]" /> Simulation only — no real capital is at risk.</span>
            <span className="flex items-center gap-1"><Bitcoin size={11} /> Crypto is an isolated sandbox.</span>
          </div>
          <p className="mt-2">
            Behavioural index scores are derived from this learner's own simulated orders, holdings, module progress and
            crash-drill record. Signals with no underlying data are excluded rather than estimated, which is why coverage
            is shown alongside the score. Report ID {reportId}.
          </p>
        </footer>
      </main>
    </div>
  );
}
