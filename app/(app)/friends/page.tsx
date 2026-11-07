import { requireUser } from "@/lib/auth";
import { getFriendsOverview } from "@/lib/friends";
import { FriendsView } from "@/components/friends-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Friends · MockTrade Matrix",
  description:
    "Search identity-verified learners, send friend requests, compare levels and streaks, and plan strategies in real-time private chat.",
};

export default async function FriendsPage() {
  const user = await requireUser();
  return (
    <FriendsView
      me={{ id: user.id, name: user.name }}
      initial={getFriendsOverview(user.id)}
    />
  );
}
