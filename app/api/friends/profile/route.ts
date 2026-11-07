import { NextResponse } from "next/server";
import { getSessionUser, isOnboarded } from "@/lib/auth";
import { getFriendProfile } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin" && !isOnboarded(user)) {
    return NextResponse.json({ error: "Finish verification first." }, { status: 403 });
  }

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Choose a learner first." }, { status: 400 });
  }

  const profile = getFriendProfile(user.id, id);
  if (!profile) return NextResponse.json({ error: "Profile not available." }, { status: 404 });
  return NextResponse.json({ profile });
}
