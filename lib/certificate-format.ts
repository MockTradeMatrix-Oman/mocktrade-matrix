import type { Certificate } from "./exam";
import { formatCertificateDate } from "@/components/certificate";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Standalone, print-ready certificate. This mirrors the on-screen sheet but
 * carries its own CSS so the downloaded file opens correctly offline.
 */
export function certificateToHtml(certificate: Certificate, origin: string): string {
  const verify = `${origin}/certificate/${certificate.serial}`;
  const issued = formatCertificateDate(certificate.issued_at);
  const revoked = Boolean(certificate.revoked);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Completion Merit Certificate — ${escapeHtml(certificate.name)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px; background: #e9edf3; font-family: Georgia, "Times New Roman", serif; color: #172033; }
  .sheet { position: relative; max-width: 960px; margin: 0 auto; background: #fcf8ef; border: 6px solid #c7a557; border-radius: 18px; padding: 5px; overflow: hidden; }
  .inner { position: relative; border: 1px solid #dcc995; border-radius: 12px; padding: 42px 48px 34px; text-align: center; }
  .corner { position: absolute; width: 26px; height: 26px; border-color: #b8913f; }
  .tl { top: 10px; left: 10px; border-top: 2px solid; border-left: 2px solid; }
  .tr { top: 10px; right: 10px; border-top: 2px solid; border-right: 2px solid; }
  .bl { bottom: 10px; left: 10px; border-bottom: 2px solid; border-left: 2px solid; }
  .br { bottom: 10px; right: 10px; border-bottom: 2px solid; border-right: 2px solid; }
  .brand { font-size: 10px; letter-spacing: .42em; text-transform: uppercase; font-weight: 600; color: #7a5d20; }
  .division { margin-top: 4px; font-size: 8px; letter-spacing: .28em; text-transform: uppercase; color: #8a7a58; }
  h1 { margin: 22px 0 0; font-size: 30px; letter-spacing: .14em; text-transform: uppercase; color: #1d2a44; }
  .sub { margin-top: 6px; font-size: 9px; letter-spacing: .26em; text-transform: uppercase; color: #8a7a58; }
  .rule { width: 90px; height: 1px; background: #c7a557; margin: 18px auto 0; }
  .certifies { margin-top: 30px; font-size: 11px; font-style: italic; color: #6b6250; }
  .name { margin: 10px auto 0; max-width: 680px; padding-bottom: 10px; border-bottom: 1px solid #cdbb8d; font-size: 36px; line-height: 1.15; color: #101a30; }
  .statement { margin: 16px auto 0; max-width: 660px; font-size: 12px; line-height: 1.7; color: #4d4a40; }
  .chips { margin-top: 24px; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
  .chip { border: 1px solid #d6c38f; background: #f6edd5; border-radius: 999px; padding: 5px 14px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 8px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #6d5522; }
  .foot { margin-top: 34px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; text-align: left; }
  .sig { flex: 1; max-width: 250px; }
  .sig .line { border-bottom: 1px solid #8d7a4c; padding-bottom: 4px; font-size: 17px; font-style: italic; color: #22304c; }
  .sig .label, .date .label { margin-top: 5px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 7.5px; letter-spacing: .18em; text-transform: uppercase; color: #8a7a58; }
  .date { flex: 1; max-width: 210px; text-align: right; }
  .date .line { border-bottom: 1px solid #8d7a4c; padding-bottom: 4px; font-size: 13px; color: #22304c; }
  .seal { width: 96px; height: 96px; flex: none; border: 3px solid #b8913f; border-radius: 50%; background: #f5ead0; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
  .seal:after { content: ""; position: absolute; inset: 6px; border: 1px dashed #c7a557; border-radius: 50%; }
  .seal .mark { font-size: 22px; color: #9a7527; line-height: 1; }
  .seal .v { margin-top: 4px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 7px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #7a5d20; }
  .verify { margin-top: 30px; border: 1px solid #ddcda2; background: #f8f1df; border-radius: 10px; padding: 10px 14px; }
  .verify .id { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 8px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #6d5522; }
  .verify .url { margin-top: 4px; font-size: 9px; color: #7b6f53; word-break: break-all; }
  .fine { margin: 16px auto 0; max-width: 700px; font-size: 7.5px; line-height: 1.6; color: #8c8167; }
  .revoked { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(252,248,239,.55); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 44px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: rgba(178,58,72,.8); transform: rotate(-14deg); }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { max-width: none; border-radius: 0; }
    @page { size: landscape; margin: 8mm; }
  }
</style></head>
<body>
  <div class="sheet">
    <div class="inner">
      <span class="corner tl"></span><span class="corner tr"></span>
      <span class="corner bl"></span><span class="corner br"></span>
      <div class="brand">MockTradeMatrix</div>
      <div class="division">Learning division · Simulation programme</div>
      <div class="rule"></div>
      <h1>Completion Merit Certificate</h1>
      <div class="sub">Financial markets simulation</div>
      <div class="certifies">This certifies that</div>
      <div class="name">${escapeHtml(certificate.name)}</div>
      <p class="statement">has completed all <strong>${certificate.modules}</strong> learning modules in the MockTradeMatrix financial literacy curriculum and passed the final assessment with a score of <strong>${certificate.score}%</strong>.</p>
      <div class="chips">
        <span class="chip">${certificate.modules} modules completed</span>
        <span class="chip">Final assessment ${certificate.score}%</span>
        <span class="chip">Simulation only</span>
      </div>
      <div class="foot">
        <div class="sig"><div class="line">Pranav Ramsingh</div><div class="label">Programme lead · MockTradeMatrix</div></div>
        <div class="seal"><div class="mark">&#9819;</div><div class="v">Verified</div><div class="v">${new Date(certificate.issued_at).getUTCFullYear()}</div></div>
        <div class="date"><div class="line">${escapeHtml(issued)}</div><div class="label">Date of issue</div></div>
      </div>
      <div class="verify">
        <div class="id">Certificate ID · ${escapeHtml(certificate.serial)}</div>
        <div class="url">Verify this record at ${escapeHtml(verify)}</div>
      </div>
      <p class="fine">This certificate recognises completion of a simulation-based financial literacy programme. It is not a regulated qualification, a licence to advise, or proof of trading performance. Credits and simulated results never convert to real money.</p>
      ${revoked ? '<div class="revoked">Revoked</div>' : ""}
    </div>
  </div>
</body></html>`;
}
