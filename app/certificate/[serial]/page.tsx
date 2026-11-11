import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search, ShieldCheck, ShieldX } from "lucide-react";
import { Wordmark } from "@/components/logo";
import { getCertificateBySerial } from "@/lib/exam";
import { siteOrigin } from "@/lib/site";
import { CertificateFrame } from "@/components/certificate";
import { CertificateActions } from "@/components/certificate-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certificate verification — MockTradeMatrix",
  description:
    "Verify a MockTradeMatrix Completion Merit Certificate by its certificate ID.",
  robots: { index: false, follow: false },
};

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const { serial } = await params;
  const certificate = getCertificateBySerial(decodeURIComponent(serial));
  const origin = await siteOrigin();

  return (
    <main className="min-h-screen bg-[#06080d] px-4 py-6 text-ink sm:px-6">
      <div className="mx-auto max-w-[1040px]">
        <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/" className="inline-flex items-center gap-2 text-[11px] text-muted hover:text-ink">
            <ArrowLeft size={13} /> Back to MockTradeMatrix
          </Link>
          <Wordmark compact />
        </header>

        {!certificate ? (
          <div className="mx-auto mt-16 max-w-[560px] rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(255,143,163,.28)] bg-[rgba(255,143,163,.08)]">
              <Search size={24} className="text-[#ff8fa3]" />
            </div>
            <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.02em]">No certificate found</h1>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              No issued certificate matches the ID <span className="font-mono text-ink">{decodeURIComponent(serial)}</span>.
              Check the ID for typos. A certificate is only issued after all modules are complete and the
              final assessment is passed.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/" className="btn btn-primary btn-sm">Open MockTradeMatrix</Link>
              <Link href="/certificate" className="btn btn-dark btn-sm">My certificate</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  {certificate.revoked ? <ShieldX size={11} /> : <ShieldCheck size={11} />} Certificate verification
                </div>
                <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.03em] sm:text-[30px]">
                  {certificate.revoked ? "This certificate has been revoked" : "Verified certificate"}
                </h1>
                <p className="mt-1.5 max-w-2xl text-[11.5px] leading-relaxed text-muted">
                  {certificate.revoked
                    ? "The record exists but it is no longer valid. Contact MockTradeMatrix if you believe this is a mistake."
                    : "This record matches an issued MockTradeMatrix Completion Merit Certificate. Only the name, score, date and status are shown."}
                </p>
              </div>
              <CertificateActions />
            </div>

            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-[10.5px] print:hidden ${
                certificate.revoked
                  ? "border-[rgba(255,143,163,.25)] bg-[rgba(255,143,163,.06)] text-[#ffb3c0]"
                  : "border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.05)] text-[#8df5d0]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold uppercase tracking-[0.1em]">
                  {certificate.revoked ? "Status · revoked" : "Status · valid"}
                </span>
                <span className="text-muted/40">·</span>
                <span>Certificate ID {certificate.serial}</span>
                <span className="text-muted/40">·</span>
                <span>{certificate.modules} modules · final assessment {certificate.score}%</span>
              </div>
            </div>

            <div className="mt-5">
              <CertificateFrame certificate={certificate} origin={origin} publicView />
            </div>

            <p className="mt-4 text-center text-[9.5px] leading-relaxed text-muted print:hidden">
              Certificates recognise completion of a simulation-based financial literacy programme. They are
              not regulated qualifications, licences to advise, or proof of trading performance.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
