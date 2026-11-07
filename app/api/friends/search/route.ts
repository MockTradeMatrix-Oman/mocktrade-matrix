import { NextResponse } from "next/server";
import { getSessionUser, isOnboarded } from "@/lib/auth";
import { searchLearners } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin" && !isOnboarded(user)) {
    return NextResponse.json({ error: "Finish verification first." }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ query: q, results: searchLearners(user.id, q) });
}
