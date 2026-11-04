import { fmtMoney, fmtPct, fmtQty } from "./finance";
import type { PortfolioReport } from "./report-types";

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(...values: unknown[]) {
  return values.map(csvCell).join(",");
}

const num = (value: number, digits = 2) => Number(value.toFixed(digits));

export function reportToCsv(report: PortfolioReport): string {
  const { user, portfolio, behavioral, history, rank } = report;
  const region = user.region;
  const lines: string[] = [];
  const add = (...values: unknown[]) => lines.push(csvRow(...values));

  add("MockTrade Matrix — Portfolio & Behavioural Report");
  add("Generated", new Date(report.generatedAt).toISOString());
  add("Name", user.name);
  add("Email", user.email);
  add("Region", region === "IN" ? "India (INR)" : "United States (USD)");
  add("Mode", user.mode);
  add("Identity verified", user.verified ? "Yes" : "No");
  add("Starting capital", num(user.startCapital));
  add("Main cash", num(portfolio.cash));
  add("Main market value", num(portfolio.marketValue));
  add("Main account total", num(portfolio.total));
  add("Crypto sandbox cash", num(portfolio.cryptoCash));
  add("Crypto sandbox value", num(portfolio.cryptoValue));
  add("Unrealised P&L", num(portfolio.unrealized));
  add("Realised P&L", num(portfolio.realized));
  add("Fees paid", num(portfolio.feesPaid));
  add("Tax paid", num(portfolio.taxPaid));
  if (rank) {
    add("Leaderboard rank", rank.rank);
    add("Return on starting capital %", num(rank.returnPct));
  } else {
    add("Leaderboard rank", "Unranked");
  }
  add("");

  add("BEHAVIOURAL INDEX");
  add("Score", behavioral.score ?? "");
  add("Band", behavioral.band);
  add("Signal coverage %", behavioral.coverage);
  add("Orders", behavioral.metrics.orders);
  add("Active days", behavioral.metrics.activeDays);
  add("Gross traded notional", num(behavioral.metrics.grossNotional));
  add("Turnover (x starting capital)", num(behavioral.metrics.turnover));
  add("Fees", num(behavioral.metrics.fees));
  add("Tax", num(behavioral.metrics.tax));
  add("Cost ratio %", num(behavioral.metrics.costRatio * 100, 4));
  add("Open positions", behavioral.metrics.positions);
  add("Asset classes", behavioral.metrics.classes);
  add("Largest holding weight %", num(behavioral.metrics.largestWeight));
  add("Cash buffer %", num(behavioral.metrics.cashPct));
  add("Closed sells", behavioral.metrics.sells);
  add("Sells at a gain", behavioral.metrics.winningSells);
  add("Modules completed", behavioral.metrics.modulesDone);
  add("Average quiz score %", num(behavioral.metrics.avgQuiz));
  add("Crash drill completed", behavioral.metrics.crashDone ? "Yes" : "No");
  add("Crash drills recorded", behavioral.metrics.crashDrills);
  add("Streak (days)", behavioral.metrics.streak);
  add("");

  add("BEHAVIOURAL COMPONENTS");
  add("Component", "Weight %", "Score", "Detail");
  for (const c of behavioral.components) {
    add(c.label, num(c.weight * 100), c.score ?? "", c.detail);
  }
  add("");

  add("HIGHLIGHTS");
  for (const h of behavioral.highlights) add(h);
  add("");
  add("CAUTIONS");
  for (const c of behavioral.cautions) add(c);
  add("");

  add("PORTFOLIO SUMMARY");
  add("Metric", `Value (${region === "IN" ? "INR" : "USD"})`);
  add("Cash", num(portfolio.cash));
  add("Invested cost", num(portfolio.invested));
  add("Market value", num(portfolio.marketValue));
  add("Unrealised P&L", num(portfolio.unrealized));
  add("Realised P&L", num(portfolio.realized));
  add("Day change", num(portfolio.dayChange));
  add("Day change %", num(portfolio.dayPct));
  add("Crypto sandbox value", num(portfolio.cryptoValue));
  add("");

  add("OPEN POSITIONS");
  add(
    "Symbol", "Name", "Class", "Qty", "Avg cost", "Live price",
    "Market value", "Weight %", "Unrealised P&L", "P&L %", "Day %"
  );
  for (const p of portfolio.positions) {
    add(
      p.symbol, p.name, p.class, num(p.qty, 6), num(p.avgLocal), num(p.priceLocal),
      num(p.value), num(portfolio.marketValue > 0 ? (p.value / portfolio.marketValue) * 100 : 0),
      num(p.pnl), num(p.pnlPct), num(p.dayPct)
    );
  }
  add("");

  add("CRYPTO SANDBOX");
  add(
    "Symbol", "Name", "Qty", "Avg cost", "Live price", "Market value",
    "Unrealised P&L", "P&L %", "Day %"
  );
  for (const p of portfolio.crypto) {
    add(
      p.symbol, p.name, num(p.qty, 6), num(p.avgLocal), num(p.priceLocal),
      num(p.value), num(p.pnl), num(p.pnlPct), num(p.dayPct)
    );
  }
  add("");

  add("ALLOCATION");
  add("Bucket", "Value", "Weight %");
  for (const a of portfolio.allocation) {
    add(a.label, num(a.value), num(a.pct));
  }
  add("");

  add("ORDERS");
  add("Time", "Side", "Symbol", "Name", "Qty", "Fill", "Notional", "Fee", "Tax", "Source");
  for (const o of report.orders) {
    add(
      new Date(o.created_at).toISOString(), o.side, o.symbol, o.name,
      num(o.qty, 6), num(o.executed_price), num(o.notional), num(o.fee), num(o.tax), o.source
    );
  }
  add("");

  add("TRANSACTIONS");
  add("Time", "Kind", "Amount", "Bucket", "Note");
  for (const t of report.transactions) {
    add(new Date(t.created_at).toISOString(), t.kind, num(t.amount), t.bucket, t.note);
  }
  add("");

  add("ANALYSIS");
  for (const a of report.analysis) add(a);
  add("");
  add("History points", history.points);
  add("History first value", history.first === null ? "" : num(history.first));
  add("History last value", history.last === null ? "" : num(history.last));
  add("History change %", history.changePct === null ? "" : num(history.changePct));
  add("");
  add("Simulation only — no real capital is at risk.");

  // BOM keeps Excel from mangling the rupee symbol and unicode dashes.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/* ------------------------------------------------------------------ */
/* Standalone HTML                                                     */
/* ------------------------------------------------------------------ */

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function scoreColor(score: number | null) {
  if (score === null) return "#94a3b8";
  if (score >= 70) return "#0f9d6b";
  if (score >= 50) return "#c2860f";
  return "#c2414b";
}

function htmlRows(rows: Array<Array<unknown>>, numericFrom = 1) {
  return rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell, i) =>
              `<td${i >= numericFrom ? ' class="num"' : ""}>${escapeHtml(cell)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
}

export function reportToHtml(report: PortfolioReport): string {
  const { user, portfolio, behavioral, history, rank } = report;
  const region = user.region;
  const money = (value: number) => fmtMoney(value, region);
  const weightOf = (value: number) =>
    portfolio.marketValue > 0 ? (value / portfolio.marketValue) * 100 : 0;

  const components = behavioral.components
    .map(
      (c) => `
        <div class="component">
          <div class="component-head">
            <span>${escapeHtml(c.label)}</span>
            <strong style="color:${scoreColor(c.score)}">${c.score === null ? "—" : c.score}</strong>
          </div>
          <div class="bar"><i style="width:${c.score ?? 0}%;background:${scoreColor(c.score)}"></i></div>
          <div class="muted small">${escapeHtml(c.detail)} · weight ${Math.round(c.weight * 100)}%</div>
        </div>`
    )
    .join("");

  const positions = portfolio.positions.length
    ? `<table>
        <thead><tr><th>Symbol</th><th>Name</th><th>Class</th><th>Qty</th><th>Avg cost</th><th>Live</th><th>Value</th><th>Weight</th><th>P&amp;L</th></tr></thead>
        <tbody>${htmlRows(
          portfolio.positions.map((p) => [
            p.symbol,
            p.name,
            p.class,
            fmtQty(p.qty),
            money(p.avgLocal),
            money(p.priceLocal),
            money(p.value),
            `${weightOf(p.value).toFixed(1)}%`,
            `${p.pnl >= 0 ? "+" : ""}${money(p.pnl)} (${fmtPct(p.pnlPct)})`,
          ]),
          3
        )}</tbody>
      </table>`
    : `<p class="muted">No open positions yet.</p>`;

  const crypto = portfolio.crypto.length
    ? `<table>
        <thead><tr><th>Symbol</th><th>Name</th><th>Qty</th><th>Avg cost</th><th>Live</th><th>Value</th><th>P&amp;L</th></tr></thead>
        <tbody>${htmlRows(
          portfolio.crypto.map((p) => [
            p.symbol,
            p.name,
            fmtQty(p.qty),
            money(p.avgLocal),
            money(p.priceLocal),
            money(p.value),
            `${p.pnl >= 0 ? "+" : ""}${money(p.pnl)} (${fmtPct(p.pnlPct)})`,
          ]),
          2
        )}</tbody>
      </table>`
    : `<p class="muted">No crypto exposure. The sandbox is empty.</p>`;

  const allocation = portfolio.allocation.length
    ? `<table>
        <thead><tr><th>Bucket</th><th>Value</th><th>Weight</th></tr></thead>
        <tbody>${htmlRows(
          portfolio.allocation.map((a) => [a.label, money(a.value), `${a.pct.toFixed(1)}%`])
        )}</tbody>
      </table>`
    : `<p class="muted">No allocation yet.</p>`;

  const orders = report.orders.length
    ? `<table>
        <thead><tr><th>Time</th><th>Side</th><th>Symbol</th><th>Qty</th><th>Fill</th><th>Notional</th><th>Fee</th><th>Tax</th><th>Source</th></tr></thead>
        <tbody>${htmlRows(
          report.orders.map((o) => [
            new Date(o.created_at).toLocaleString("en-US"),
            o.side,
            o.symbol,
            fmtQty(o.qty),
            money(o.executed_price),
            money(o.notional),
            money(o.fee),
            o.tax > 0 ? money(o.tax) : "—",
            o.source,
          ]),
          3
        )}</tbody>
      </table>`
    : `<p class="muted">No executions yet.</p>`;

  const transactions = report.transactions.length
    ? `<table>
        <thead><tr><th>Time</th><th>Kind</th><th>Bucket</th><th>Note</th><th>Amount</th></tr></thead>
        <tbody>${htmlRows(
          report.transactions.map((t) => [
            new Date(t.created_at).toLocaleString("en-US"),
            t.kind.replace(/_/g, " "),
            t.bucket,
            t.note,
            t.amount >= 0 ? `+${t.amount}` : String(t.amount),
          ]),
          4
        )}</tbody>
      </table>`
    : `<p class="muted">No transactions yet.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Portfolio report — ${escapeHtml(user.name)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 18px; background: #eef2f7; color: #0b1220; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  .sheet { max-width: 1040px; margin: 0 auto; background: #fff; border: 1px solid #dbe2ec; border-radius: 14px; padding: 34px; box-shadow: 0 20px 50px -30px rgba(15,23,42,.45); }
  h1 { font-size: 25px; margin: 0; letter-spacing: -.02em; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .1em; margin: 30px 0 10px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 7px; }
  p { line-height: 1.55; }
  .brand { font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #0f9d6b; }
  .meta { margin-top: 8px; color: #475569; font-size: 12px; line-height: 1.7; }
  .toolbar { max-width: 1040px; margin: 0 auto 14px; display: flex; gap: 8px; justify-content: flex-end; }
  .btn { border: 1px solid #cbd5e1; background: #fff; color: #0b1220; border-radius: 8px; padding: 7px 12px; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; }
  .btn.primary { background: #0f9d6b; border-color: #0f9d6b; color: #fff; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; }
  .kpi .label { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #64748b; }
  .kpi .value { margin-top: 5px; font-size: 17px; font-weight: 700; }
  .kpi .sub { margin-top: 3px; font-size: 10px; color: #64748b; }
  .index { display: flex; gap: 22px; align-items: center; flex-wrap: wrap; margin-top: 14px; }
  .ring { width: 126px; height: 126px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(${scoreColor(behavioral.score)} ${(behavioral.score ?? 0) * 3.6}deg, #e2e8f0 0deg); }
  .ring-inner { width: 94px; height: 94px; border-radius: 50%; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .ring-inner strong { font-size: 30px; line-height: 1; }
  .ring-inner span { font-size: 10px; color: #64748b; margin-top: 3px; }
  .band { font-size: 18px; font-weight: 700; }
  .coverage { font-size: 12px; color: #64748b; margin-top: 4px; }
  .components { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 22px; margin-top: 18px; }
  .component-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; }
  .bar { height: 6px; border-radius: 99px; background: #e8edf5; margin-top: 6px; overflow: hidden; }
  .bar i { display: block; height: 100%; border-radius: 99px; }
  .small { font-size: 10px; margin-top: 5px; }
  .muted { color: #64748b; }
  .callout { border-left: 3px solid #0f9d6b; background: #f0fdf7; padding: 9px 12px; border-radius: 0 8px 8px 0; margin: 8px 0; font-size: 12px; }
  .callout.warn { border-left-color: #c2860f; background: #fffbeb; }
  ul { margin: 10px 0 0; padding-left: 18px; }
  li { margin: 6px 0; font-size: 12.5px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
  th { text-align: left; text-transform: uppercase; letter-spacing: .08em; font-size: 9px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 7px 6px; }
  td { border-bottom: 1px solid #eef2f7; padding: 7px 6px; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; }
  .footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #64748b; }
  @media (max-width: 720px) { .grid { grid-template-columns: 1fr 1fr; } .components { grid-template-columns: 1fr; } .sheet { padding: 20px; } }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { border: 0; box-shadow: none; border-radius: 0; max-width: none; padding: 0; }
    .toolbar { display: none; }
    h2 { break-after: avoid; }
    table, .component, .kpi { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="btn primary" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <main class="sheet">
    <div class="brand">MockTrade Matrix · Simulation report</div>
    <h1>Portfolio &amp; Behavioural Report</h1>
    <div class="meta">
      <strong>${escapeHtml(user.name)}</strong> · ${escapeHtml(user.email)}<br />
      ${region === "IN" ? "India (INR)" : "United States (USD)"} · ${escapeHtml(user.mode)} · Identity ${user.verified ? "verified" : "not verified"}<br />
      Generated ${escapeHtml(new Date(report.generatedAt).toLocaleString("en-US"))}
    </div>

    <div class="grid">
      <div class="kpi"><div class="label">Main account</div><div class="value">${money(portfolio.total)}</div><div class="sub">Cash + market value</div></div>
      <div class="kpi"><div class="label">Invested</div><div class="value">${money(portfolio.invested)}</div><div class="sub">${portfolio.positions.length} open positions</div></div>
      <div class="kpi"><div class="label">Unrealised P&amp;L</div><div class="value">${portfolio.unrealized >= 0 ? "+" : ""}${money(portfolio.unrealized)}</div><div class="sub">${portfolio.invested > 0 ? fmtPct((portfolio.unrealized / portfolio.invested) * 100) : "—"} on cost</div></div>
      <div class="kpi"><div class="label">Realised P&amp;L</div><div class="value">${portfolio.realized >= 0 ? "+" : ""}${money(portfolio.realized)}</div><div class="sub">After fees &amp; tax</div></div>
      <div class="kpi"><div class="label">Cash</div><div class="value">${money(portfolio.cash)}</div><div class="sub">${behavioral.metrics.cashPct.toFixed(1)}% of account</div></div>
      <div class="kpi"><div class="label">Crypto sandbox</div><div class="value">${money(portfolio.cryptoValue)}</div><div class="sub">Cash ${money(portfolio.cryptoCash)}</div></div>
      <div class="kpi"><div class="label">Fees + tax paid</div><div class="value">${money(portfolio.feesPaid + portfolio.taxPaid)}</div><div class="sub">${behavioral.metrics.orders} fills</div></div>
      <div class="kpi"><div class="label">Leaderboard</div><div class="value">${rank ? `#${rank.rank}` : "Unranked"}</div><div class="sub">${rank ? `${fmtPct(rank.returnPct)} on starting capital` : "No ranked return yet"}</div></div>
    </div>

    <h2>Behavioural index</h2>
    <div class="index">
      <div class="ring"><div class="ring-inner"><strong>${behavioral.score ?? "—"}</strong><span>/ 100</span></div></div>
      <div>
        <div class="band" style="color:${scoreColor(behavioral.score)}">${escapeHtml(behavioral.band)}</div>
        <div class="coverage">${behavioral.coverage}% signal coverage · built only from your real simulated activity</div>
      </div>
    </div>
    <div class="components">${components}</div>
    <h2>Highlights &amp; cautions</h2>
    ${behavioral.highlights.map((h) => `<div class="callout">${escapeHtml(h)}</div>`).join("")}
    ${behavioral.cautions.map((c) => `<div class="callout warn">${escapeHtml(c)}</div>`).join("")}

    <h2>Analysis</h2>
    <ul>${report.analysis.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>

    <h2>Open positions</h2>
    ${positions}

    <h2>Crypto sandbox</h2>
    ${crypto}

    <h2>Allocation</h2>
    ${allocation}

    <h2>Execution ledger</h2>
    ${orders}

    <h2>Transactions</h2>
    ${transactions}

    <h2>Mark-to-market history</h2>
    <p class="muted">
      ${history.points} point${history.points === 1 ? "" : "s"} ·
      ${history.first === null ? "—" : money(history.first)} → ${history.last === null ? "—" : money(history.last)} ·
      ${history.changePct === null ? "no change available" : fmtPct(history.changePct)} (cash excluded)
    </p>

    <div class="footer">
      Simulation only — no real capital is at risk. Behavioural index scores are derived from the learner's own
      simulated orders, holdings, module progress and crash-drill record. Missing signals are excluded rather than
      estimated, which is why coverage is shown alongside the score.
    </div>
  </main>
</body>
</html>`;
}
