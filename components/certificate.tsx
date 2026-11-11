import { Crown, ShieldCheck } from "lucide-react";
import type { Certificate } from "@/lib/exam";

export function formatCertificateDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function certificateVerifyPath(serial: string) {
  return `/certificate/${serial}`;
}

export function certificateVerifyUrl(serial: string, origin = "") {
  return `${origin}${certificateVerifyPath(serial)}`;
}

/**
 * The certificate is a light, print-first sheet so it survives a black-and-white
 * printer. It is shown inside the app and on the public verification page.
 */
export function CertificateFrame({
  certificate,
  origin = "",
  publicView = false,
}: {
  certificate: Certificate;
  origin?: string;
  publicView?: boolean;
}) {
  const revoked = Boolean(certificate.revoked);
  const verify = certificateVerifyUrl(certificate.serial, origin);

  return (
    <div
      data-no-i18n
      className="certificate-sheet relative mx-auto w-full max-w-[920px] overflow-hidden rounded-[22px] border-[6px] border-[#c7a557] bg-[#fcf8ef] p-[4px] text-[#172033] shadow-[0_30px_80px_-30px_rgba(0,0,0,.7)] print:max-w-none print:rounded-none print:border-0 print:shadow-none"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <div className="relative rounded-[15px] border border-[#dcc995] px-6 py-9 sm:px-12 sm:py-12 print:rounded-none">
        {/* corner flourishes */}
        {[
          "left-3 top-3 border-l-2 border-t-2",
          "right-3 top-3 border-r-2 border-t-2",
          "left-3 bottom-3 border-b-2 border-l-2",
          "right-3 bottom-3 border-b-2 border-r-2",
        ].map((position) => (
          <span
            key={position}
            className={`pointer-events-none absolute h-7 w-7 border-[#b8913f] ${position}`}
          />
        ))}

        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#c7a557] to-transparent" />

        <header className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#7a5d20]">
            MockTradeMatrix
          </div>
          <div className="mt-1 text-[8.5px] uppercase tracking-[0.28em] text-[#8a7a58]">
            Learning division · Simulation programme
          </div>
          <div className="mx-auto mt-5 h-px w-24 bg-[#c7a557]" />
          <h1 className="mt-5 text-[24px] font-semibold uppercase leading-tight tracking-[0.14em] text-[#1d2a44] sm:text-[32px]">
            Completion Merit Certificate
          </h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.26em] text-[#8a7a58]">
            Financial markets simulation
          </p>
        </header>

        <div className="mt-8 text-center">
          <p className="text-[11px] italic tracking-wide text-[#6b6250]">This certifies that</p>
          <div className="mx-auto mt-3 max-w-[640px] border-b border-[#cdbb8d] pb-3">
            <div className="text-[27px] leading-tight text-[#101a30] sm:text-[38px]">
              {certificate.name}
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-[610px] text-[11.5px] leading-relaxed text-[#4d4a40] sm:text-[12.5px]">
            has completed all <strong>{certificate.modules}</strong> learning modules in the
            MockTradeMatrix financial literacy curriculum and passed the final assessment with a
            score of <strong>{certificate.score}%</strong>.
          </p>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          <span className="rounded-full border border-[#d6c38f] bg-[#f6edd5] px-3.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6d5522]">
            {certificate.modules} modules completed
          </span>
          <span className="rounded-full border border-[#d6c38f] bg-[#f6edd5] px-3.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6d5522]">
            Final assessment {certificate.score}%
          </span>
          <span className="rounded-full border border-[#d6c38f] bg-[#f6edd5] px-3.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6d5522]">
            Simulation only
          </span>
        </div>

        <div className="mt-9 flex flex-col items-center justify-between gap-7 sm:flex-row sm:items-end">
          <div className="w-full max-w-[230px] text-center sm:text-left">
            <div className="border-b border-[#8d7a4c] pb-1 text-[17px] italic text-[#22304c]">
              Pranav Ramsingh
            </div>
            <div className="mt-1.5 text-[8.5px] uppercase tracking-[0.18em] text-[#8a7a58]">
              Programme lead · MockTradeMatrix
            </div>
          </div>

          <div className="relative flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full border-[3px] border-[#b8913f] bg-[#f5ead0]">
            <div className="absolute inset-[7px] rounded-full border border-dashed border-[#c7a557]" />
            <div className="flex flex-col items-center">
              <Crown size={26} className="text-[#9a7527]" strokeWidth={1.6} />
              <div className="mt-1 text-[7.5px] font-semibold uppercase tracking-[0.16em] text-[#7a5d20]">
                Verified
              </div>
              <div className="text-[7px] uppercase tracking-[0.12em] text-[#9a8455]">
                {new Date(certificate.issued_at).getUTCFullYear()}
              </div>
            </div>
          </div>

          <div className="w-full max-w-[230px] text-center sm:text-right">
            <div className="border-b border-[#8d7a4c] pb-1 text-[13px] text-[#22304c]">
              {formatCertificateDate(certificate.issued_at)}
            </div>
            <div className="mt-1.5 text-[8.5px] uppercase tracking-[0.18em] text-[#8a7a58]">
              Date of issue
            </div>
          </div>
        </div>

        <div className="mt-9 rounded-xl border border-[#ddcda2] bg-[#f8f1df] px-4 py-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[#6d5522]">
            <ShieldCheck size={11} /> Certificate ID · {certificate.serial}
          </div>
          <div className="mt-1 break-all text-[9px] text-[#7b6f53]">
            Verify this record at {verify}
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-[650px] text-center text-[7.5px] leading-relaxed text-[#8c8167]">
          This certificate recognises completion of a simulation-based financial literacy programme.
          It is not a regulated qualification, a licence to advise, or proof of trading performance.
          Credits and simulated results never convert to real money.
        </p>

        {revoked && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#fcf8ef]/55">
            <div className="rotate-[-14deg] rounded-xl border-[5px] border-[#b23a48]/70 px-10 py-4 text-[38px] font-bold uppercase tracking-[0.18em] text-[#b23a48]/80">
              Revoked
            </div>
          </div>
        )}

        {publicView && !revoked && (
          <div className="absolute right-4 top-4 rounded-full border border-[#b7dcc6] bg-[#e7f5ec] px-3 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1f7a4d]">
            Record verified
          </div>
        )}
      </div>
    </div>
  );
}
