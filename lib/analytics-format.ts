import { fmtMoney } from "./finance";
import type { AnalyticsMetric, AnalyticsReport } from "./analytics-types";

export function metricValue(metric: AnalyticsMetric, region: string): string {
  if (metric.value === null) return "—";
  switch (metric.unit) {
    case "money":
      return fmtMoney(metric.value, region);
    case "pct":
      return `${metric.value.toFixed(1)}%`;
    case "x":
      return `${metric.value.toFixed(1)}×`;
    case "count": {
      const rounded = Math.round(metric.value * 10) / 10;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }
    case "score":
      return Math.round(metric.value).toString();
    default:
      return metric.text ?? String(metric.value);
  }
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function analyticsToCsv(report: AnalyticsReport): string {
  const region = report.user.region;
  const rows: Array<Array<string | number>> = [
    ["Section", "Metric", "Value", "Detail"],
  ];

  for (const item of report.headline) {
    const value =
      item.value === null
        ? "—"
        : item.unit === "money"
          ? fmtMoney(item.value, region)
          : item.unit === "pct"
            ? `${item.value.toFixed(2)}%`
            : String(item.value);
    rows.push(["Return", item.label, value, item.sub]);
  }

  rows.push(["Risk", "Behavioural index", report.risk.score ?? "—", `${report.risk.band} · ${report.risk.coverage}% coverage`]);
  for (const metric of report.risk.metrics) {
    rows.push(["Risk", metric.label, metricValue(metric, region), metric.detail]);
  }
  for (const metric of report.execution) {
    rows.push(["Execution", metric.label, metricValue(metric, region), metric.detail]);
  }

  rows.push(["Learning", "Modules completed", `${report.learning.modulesDone}/${report.learning.totalModules}`, `Next: ${report.learning.nextModule?.title ?? "none"}`]);
  rows.push(["Learning", "Average quiz score", `${report.learning.avgQuiz.toFixed(0)}%`, `Best ${report.learning.bestQuiz.toFixed(0)}% over ${report.learning.attempts} attempts`]);
  rows.push(["Learning", "Crash drill", report.learning.crashDone ? "Completed" : "Not completed", ""]);
  rows.push(["Learning", "Streak", `${report.learning.streak} days`, ""]);
  rows.push(["Learning", "Arena record", `${report.learning.arenaWins} wins / ${report.learning.arenaMatches} matches`, ""]);
  rows.push(["Learning", "Level", String(report.learning.level), `${report.learning.xp} XP`]);

  report.guidance.forEach((line, index) => {
    rows.push(["Improvement plan", `Step ${index + 1}`, line, ""]);
  });

  rows.push(["Meta", "Generated", new Date(report.generatedAt).toISOString(), "Simulation only — no real capital at risk"]);

  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function analyticsToHtml(report: AnalyticsReport): string {
  const region = report.user.region;
  const generated = new Date(report.generatedAt);

  const head = report.headline
    .map(
      (item) => `<div class="kpi"><div class="k">${escapeHtml(item.label)}</div>
      <div class="v">${
        item.value === null
          ? "—"
          : item.unit === "money"
            ? fmtMoney(item.value, region)
            : item.unit === "pct"
              ? `${item.value.toFixed(2)}%`
              : item.value
      }</div><div class="s">${escapeHtml(item.sub)}</div></div>`
    )
    .join("");

  const metrics = (items: AnalyticsMetric[], section: string) =>
    items
      .map(
        (metric) => `<tr><td>${escapeHtml(section)}</td><td>${escapeHtml(metric.label)}</td>
        <td class="num">${escapeHtml(metricValue(metric, region))}</td><td>${escapeHtml(metric.detail)}</td></tr>`
      )
      .join("");

  const guidance = report.guidance
    .map((line, index) => `<li><strong>${index + 1}.</strong> ${escapeHtml(line)}</li>`)
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>MockTradeMatrix analytics — ${escapeHtml(report.user.name)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; margin: 32px; color: #0b1220; }
  h1 { font-size: 24px; margin: 0; }
  .meta { color: #5b6a82; font-size: 12px; margin-top: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin: 20px 0; }
  .kpi { border: 1px solid #e6ebf2; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
  .k { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: #64748b; font-weight: 600; }
  .v { font-size: 18px; font-weight: 650; margin-top: 4px; }
  .s { font-size: 10px; color: #64748b; margin-top: 2px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .12em; color: #334155; margin: 26px 0 8px; border-bottom: 1px solid #e6ebf2; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
  th { font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  ol { padding-left: 18px; font-size: 12px; line-height: 1.7; }
  footer { margin-top: 28px; border-top: 1px solid #e6ebf2; padding-top: 10px; font-size: 10px; color: #64748b; }
</style></head>
<body>
  <h1>Complete analytics &amp; improvement plan</h1>
  <div class="meta">${escapeHtml(report.user.name)} · ${escapeHtml(report.user.email)} · ${region === "IN" ? "India (INR)" : "United States (USD)"} · generated ${generated.toLocaleString("en-US")}</div>

  <h2>Return</h2>
  <div class="grid">${head}</div>

  <h2>Risk &amp; behaviour</h2>
  <p style="font-size:12px">Behavioural index: <strong>${report.risk.score ?? "—"}/100</strong> (${escapeHtml(report.risk.band)}, ${report.risk.coverage}% signal coverage).</p>
  <table><thead><tr><th>Area</th><th>Metric</th><th class="num">Value</th><th>Reading</th></tr></thead>
  <tbody>${metrics(report.risk.metrics, "Risk")}${metrics(report.execution, "Execution")}</tbody></table>

  <h2>Learning</h2>
  <table><tbody>
    <tr><td>Modules completed</td><td class="num">${report.learning.modulesDone}/${report.learning.totalModules}</td><td>Next: ${escapeHtml(report.learning.nextModule?.title ?? "none")}</td></tr>
    <tr><td>Average quiz score</td><td class="num">${report.learning.avgQuiz.toFixed(0)}%</td><td>Best ${report.learning.bestQuiz.toFixed(0)}% over ${report.learning.attempts} attempts</td></tr>
    <tr><td>Crash drill</td><td class="num">${report.learning.crashDone ? "Completed" : "Not completed"}</td><td></td></tr>
    <tr><td>Streak</td><td class="num">${report.learning.streak} days</td><td></td></tr>
    <tr><td>Arena record</td><td class="num">${report.learning.arenaWins}/${report.learning.arenaMatches}</td><td>Wins over finished matches</td></tr>
    <tr><td>Level</td><td class="num">${report.learning.level}</td><td>${report.learning.xp} XP</td></tr>
  </tbody></table>

  <h2>Improvement plan</h2>
  <ol>${guidance}</ol>

  <footer>
    MockTradeMatrix · simulated markets only. Credits and results are educational and cannot be converted to cash.
    Analysis is derived from this account's own records; missing data is shown as — rather than estimated.
  </footer>
</body></html>`;
}
