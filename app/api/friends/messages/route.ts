import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isOnboarded } from "@/lib/auth";
import { getThread, sendDirectMessage } from "@/lib/friends";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.coerce.number().int().positive(),
  body: z.string().max(4000),
});

function blocked(user: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin" && !isOnboarded(user)) {
    return NextResponse.json({ error: "Finish verification first." }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  const denied = blocked(user);
  if (denied) return denied;

  const id = Number(new URL(req.url).searchParams.get("userId"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Choose a friend first." }, { status: 400 });
  }

  const messages = getThread(user!.id, id);
  if (!messages) return NextResponse.json({ error: "You can only message accepted friends." }, { status: 403 });
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const denied = blocked(user);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

  const result = sendDirectMessage(user!, parsed.data.userId, parsed.data.body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
