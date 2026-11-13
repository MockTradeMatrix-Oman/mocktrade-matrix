import Link from "next/link";
import { ArrowRight, Award, Crown } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getModules } from "@/lib/data";
import { isPremium } from "@/lib/plans";
import { getCertificate } from "@/lib/exam";
import { LearnLadder, type LearnModule } from "@/components/learn-ladder";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const user = await requireUser();
  const modules = getModules(user.id) as LearnModule[];
  const premium = isPremium(user);
  const completed = modules.filter((module) => module.status === "completed").length;
  const allComplete = modules.length > 0 && completed >= modules.length;
  const certificate = premium && allComplete ? getCertificate(user.id) : null;

  return (
    <>
      {allComplete && (
        <div className="mx-auto max-w-[1120px] px-4 pt-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(255,208,141,.22)] bg-[rgba(255,208,141,.045)] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,208,141,.3)] bg-[rgba(255,208,141,.1)]">
                <Award size={17} className="text-[#ffd08d]" />
              </span>
              <div>
                <div className="text-[13px] font-semibold">
                  {certificate
                    ? "Completion Merit Certificate issued"
                    : premium
                      ? "Final assessment unlocked"
                      : "Curriculum complete"}
                </div>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                  {certificate
                    ? `Your certificate is ready. Certificate ID ${certificate.serial}.`
                    : premium
                      ? "Every module is complete. Open the Certificate tab to take the final assessment and earn the Completion Merit Certificate."
                      : "Every module is complete. Premium unlocks the final assessment and the Completion Merit Certificate."}
                </p>
              </div>
            </div>
            <Link
              href={premium ? "/certificate" : "/pricing"}
              className="btn btn-primary btn-sm"
            >
              {certificate ? <Award size={12} /> : premium ? <Award size={12} /> : <Crown size={12} />}
              {certificate ? "Open certificate" : premium ? "Take final assessment" : "See Premium"}
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      <LearnLadder
        modules={modules.map((m) => ({
          id: m.id,
          slug: m.slug,
          title: m.title,
          subtitle: m.subtitle,
          description: m.description,
          level: m.level,
          order_index: m.order_index,
          minutes: m.minutes,
          reward_credits: m.reward_credits,
          unlock_cost: m.unlock_cost,
          questions: m.questions,
          status: m.status,
          score: m.score,
          is_free: m.is_free,
        }))}
        credits={user.credits}
        xp={user.xp}
        streak={user.streak}
        premium={premium}
      />
    </>
  );
}
