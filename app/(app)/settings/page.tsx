import { requireUser } from "@/lib/auth";
import { getClassrooms } from "@/lib/data";
import { SettingsView } from "@/components/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const classrooms = getClassrooms(user.id).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    members: c.members,
    role: c.role ?? "member",
  }));

  return (
    <SettingsView
      classrooms={classrooms}
      user={{
        name: user.name,
        email: user.email,
        mode: user.mode,
        region: user.region,
        arenaRegion: user.arena_region || (user.region === "US" ? "US" : "IN"),
        accent: user.accent,
        credits: user.credits,
        cash: user.cash,
        cryptoCash: user.crypto_cash,
        xp: user.xp,
        streak: user.streak,
        startCapital: user.start_capital,
        idVerified: user.id_verified,
        guardianStatus: user.guardian_status,
        createdAt: user.created_at,
        crashDone: user.crash_done,
      }}
    />
  );
}
