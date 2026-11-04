import { requireInstitution } from "@/lib/auth";
import {
  competitionStandings,
  getClassroomAnalytics,
  getClassroomMembers,
  getCompetitions,
  getOwnedClassrooms,
  getSupportRequests,
} from "@/lib/institution";
import { InstitutionView, type Competition, type Member } from "@/components/institution-view";

export const dynamic = "force-dynamic";

export default async function InstitutionPage({
  searchParams,
}: {
  searchParams: Promise<{ classroom?: string }>;
}) {
  const user = await requireInstitution();
  const classrooms = getOwnedClassrooms(user.id);
  const sp = await searchParams;
  const requested = Number(sp.classroom);
  const active = classrooms.find((c) => c.id === requested) ?? classrooms[0] ?? null;
  const activeId = active?.id ?? null;

  let analytics = null;
  let members: Member[] = [];
  let competitions: Competition[] = [];
  if (activeId) {
    analytics = getClassroomAnalytics(activeId);
    members = getClassroomMembers(activeId);
    const rows = getCompetitions(activeId);
    competitions = rows.map((r) => {
      const s = competitionStandings(r);
      return {
        id: r.id,
        name: r.name,
        startsAt: r.starts_at,
        endsAt: r.ends_at,
        status: r.status,
        A: s.A,
        B: s.B,
      };
    });
  }
  const support = getSupportRequests(user.id);

  return (
    <InstitutionView
      user={{ name: user.name, email: user.email, region: user.region }}
      classrooms={classrooms}
      activeId={activeId}
      analytics={analytics}
      members={members}
      competitions={competitions}
      support={support}
    />
  );
}
