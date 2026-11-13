import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, Award, CheckCircle2, Crown, ExternalLink, GraduationCap, Lock, ShieldCheck,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { examEligibility, EXAM_PASS_PCT } from "@/lib/exam";
import { siteOrigin } from "@/lib/site";
import { Badge, Card, Progress } from "@/components/ui";
import { CertificateFrame, certificateVerifyPath } from "@/components/certificate";
import { CertificateActions } from "@/components/certificate-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Completion Merit Certificate — MockTrade Matrix",
  robots: { index: false, follow: false },
};

export default async function CertificatePage() {
  const user = await requireUser();
  const gate = examEligibility(user);
  const origin = await siteOrigin();

  if (!gate.certificate) {
    return (
      <div className="mx-auto max-w-[900px] px-4 pb-16 pt-6 sm:px-6">
        <div className="eyebrow flex items-center gap-1.5"><Award size={11} /> Certificate</div>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
          Completion Merit Certificate
        </h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          The certificate is issued after completing every learning module and passing the final
          assessment with {EXAM_PASS_PCT}% or more. It carries a public verification link so anyone can
          check the record.
        </p>

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {gate.premium ? (
                  <Award size={15} className="text-[#ffd08d]" />
                ) : (
                  <Lock size={15} className="text-[#ffd08d]" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#ffd08d]">
                  {gate.premium ? "Assessment status" : "Premium certificate"}
                </span>
              </div>
              <div className="mt-3 text-[20px] font-semibold">
                {!gate.premium
                  ? "Premium unlocks the certificate path"
                  : gate.allComplete
                    ? "Curriculum complete — pass the final assessment"
                    : "Finish the curriculum first"}
              </div>
              <p className="mt-1.5 max-w-xl text-[11px] leading-relaxed text-muted">
                {!gate.premium
                  ? "Premium includes every module unlock, the final assessment and the certificate itself."
                  : gate.allComplete
                    ? gate.bestPercent === null
                      ? "You have not attempted the final assessment yet. The pass mark is 80%."
                      : `Your best attempt so far is ${gate.bestPercent}%. You need 80% to earn the certificate.`
                    : `${gate.modulesDone} of ${gate.totalModules} modules are complete. The assessment opens when all of them are done.`}
              </p>
            </div>
            <Badge tone={gate.premium ? "green" : "amber"}>
              {gate.premium ? <CheckCircle2 size={9} /> : <Crown size={9} />}
              {gate.premium ? "Premium" : "Free plan"}
            </Badge>
          </div>

          {gate.premium && gate.totalModules > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Curriculum completion</span>
                <span className="num font-semibold text-ink">
                  {Math.round((gate.modulesDone / gate.totalModules) * 100)}%
                </span>
              </div>
              <Progress
                className="mt-2"
                value={(gate.modulesDone / gate.totalModules) * 100}
                tone={gate.allComplete ? "green" : "violet"}
              />
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {!gate.premium ? (
              <Link href="/pricing" className="btn btn-primary">
                <Crown size={14} /> See Premium <ArrowRight size={13} />
              </Link>
            ) : gate.allComplete ? (
              <Link href="/exam" className="btn btn-primary">
                <Award size={14} /> Take final assessment <ArrowRight size={13} />
              </Link>
            ) : (
              <Link href="/learn" className="btn btn-primary">
                <GraduationCap size={14} /> Continue learning <ArrowRight size={13} />
              </Link>
            )}
            <Link href={gate.premium ? "/analytics" : "/portfolio/report"} className="btn btn-dark">
              {gate.premium ? "Open analytics" : "Open free report"}
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[9.5px] text-muted">
            <ShieldCheck size={10} className="text-[#5beeb9]" />
            Certificates are learning records only. They are not a licence or financial advice.
          </div>
        </Card>
      </div>
    );
  }

  const certificate = gate.certificate;
  const verifyPath = certificateVerifyPath(certificate.serial);

  return (
    <div className="mx-auto max-w-[1040px] px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Award size={11} /> Certificate</div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
            Completion Merit Certificate
          </h1>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            Issued to {certificate.name} · {certificate.modules} modules completed · final assessment {certificate.score}%
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone="green"><ShieldCheck size={9} /> Verified record</Badge>
          <CertificateActions download printHref={verifyPath} />
        </div>
      </div>

      <div className="mt-5">
        <CertificateFrame certificate={certificate} origin={origin} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-muted print:hidden">
        <Link href={verifyPath} className="inline-flex items-center gap-1 font-semibold text-[#8df5d0] hover:underline">
          <ExternalLink size={11} /> Open public verification page
        </Link>
        <span className="text-muted/30">·</span>
        <span>Share only the verification link, not your account.</span>
        <span className="text-muted/30">·</span>
        <Link href="/exam" className="inline-flex items-center gap-1 font-semibold text-[#8df5d0] hover:underline">
          Retake assessment <ArrowRight size={10} />
        </Link>
      </div>
    </div>
  );
}
