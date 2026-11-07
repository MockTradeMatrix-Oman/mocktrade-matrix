import { NextResponse } from "next/server";
import { getSessionUser, isOnboarded } from "@/lib/auth";
import { getFriendsOverview } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin" && !isOnboarded(user)) {
    return NextResponse.json({ error: "Finish verification first." }, { status: 403 });
  }
  return NextResponse.json(getFriendsOverview(user.id));
}
