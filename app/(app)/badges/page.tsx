import type { Metadata } from "next";
import { Award } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getBadges } from "@/lib/fun/badges";
import { BadgeGrid } from "@/components/badge-grid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Badges — MockTrade Matrix",
  description: "Achievements computed from real learning, trading and arena activity. No purchased badges.",
  robots: { index: false, follow: false },
};

export default async function BadgesPage() {
  const user = await requireUser();
  const cabinet = getBadges(user.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Award size={11} /> Play · free</div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
            Badge cabinet
          </h1>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-muted">
            Every badge is computed from activity already in your account. Opening this page checks
            your history and awards anything you have genuinely completed.
          </p>
        </div>
        <div className="chip chip-amber"><Award size={9} /> {cabinet.earned}/{cabinet.total} earned</div>
      </div>

      <BadgeGrid badges={cabinet.badges} newKeys={cabinet.newKeys} />

      <p className="px-1 text-[10px] leading-relaxed text-muted">
        Badges cannot be bought, gifted or invented. The stored earn date stays fixed once awarded.
      </p>
    </div>
  );
}
