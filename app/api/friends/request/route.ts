import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isOnboarded } from "@/lib/auth";
import { sendFriendRequest } from "@/lib/friends";

const schema = z.object({ userId: z.coerce.number().int().positive() });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin" && !isOnboarded(user)) {
    return NextResponse.json({ error: "Finish verification first." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a learner first." }, { status: 400 });

  const result = sendFriendRequest(user, parsed.data.userId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
