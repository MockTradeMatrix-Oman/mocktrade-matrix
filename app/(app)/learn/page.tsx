import { requireUser } from "@/lib/auth";
import { getModules } from "@/lib/data";
import { isPremium } from "@/lib/plans";
import { LearnLadder, type LearnModule } from "@/components/learn-ladder";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const user = await requireUser();
  const modules = getModules(user.id) as LearnModule[];

  return (
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
      premium={isPremium(user)}
    />
  );
}
