import { redirect } from "next/navigation";
import { isOnboarded, requireUser } from "@/lib/auth";
import { isPremium, planLabel } from "@/lib/plans";
import { getAssets, getNotifications, getPredictionStats, getUnreadCount } from "@/lib/data";
import { getFriendBadges } from "@/lib/friends";
import { SocketProvider } from "@/components/socket";
import { ToastProvider } from "@/components/toast";
import { Shell } from "@/components/shell";
import { CrashOverlay } from "@/components/crash-overlay";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // The rest of the app stays locked until identity, guardian (when under 18)
  // and every agreement are complete. Admins are exempt so the console is
  // always reachable.
  if (user.role !== "admin" && !isOnboarded(user)) redirect("/verify");
  const notifications = getNotifications(user.id, 10);
  const unread = getUnreadCount(user.id);
  const friendBadges = getFriendBadges(user.id);
  const assets = getAssets().map((a) => ({
    symbol: a.symbol,
    price: a.price,
    prev_close: a.prev_close,
    sentiment: a.sentiment,
    class: a.class,
  }));
  const accuracy = getPredictionStats().accuracy;

  return (
    <ToastProvider>
      <SocketProvider initialAssets={assets} initialAccuracy={accuracy}>
        <Shell
          user={{
            id: user.id, name: user.name, email: user.email, avatar: user.avatar, mode: user.mode,
            role: user.role, verified: Boolean(user.id_verified), institutionAccess: Boolean((user as any).institution_access),
            premium: isPremium(user), planLabel: planLabel(user),
            region: user.region, credits: user.credits, cash: user.cash, xp: user.xp,
            streak: user.streak, accent: user.accent,
          }}
          notifications={notifications}
          unread={unread}
          friendBadges={friendBadges}
        >
          {children}
        </Shell>
        <CrashOverlay />
      </SocketProvider>
    </ToastProvider>
  );
}
