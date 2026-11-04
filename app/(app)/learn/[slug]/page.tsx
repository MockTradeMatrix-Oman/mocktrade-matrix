import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getModule, getModules, getPredictionStats } from "@/lib/data";
import { ModuleExperience, type ModuleData } from "@/components/module-experience";

export const dynamic = "force-dynamic";

export default async function LearnModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const data = getModule(slug, user.id);
  if (!data) notFound();

  const mod = data.module;
  const moduleData: ModuleData = {
    id: mod.id,
    slug: mod.slug,
    title: mod.title,
    subtitle: mod.subtitle,
    description: mod.description,
    level: mod.level,
    order_index: mod.order_index,
    minutes: mod.minutes,
    reward_credits: mod.reward_credits,
    unlock_cost: mod.unlock_cost,
    video_url: mod.video_url,
    content: mod.content,
    is_free: mod.is_free,
    questions: data.questions,
    status: data.status,
    score: data.score,
  };

  return (
    <ModuleExperience
      module={moduleData}
      prev={data.prev ? { slug: data.prev.slug, title: data.prev.title } : null}
      next={data.next ? { slug: data.next.slug, title: data.next.title } : null}
      credits={user.credits}
      accuracy={getPredictionStats().accuracy}
      totalModules={getModules(user.id).length}
    />
  );
}
