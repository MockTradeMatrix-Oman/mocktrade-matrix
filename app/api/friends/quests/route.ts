import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isOnboarded } from "@/lib/auth";
import { getQuestsOverview, inviteQuest, respondQuest, cancelQuest } from "@/lib/quests";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    userId: z.coerce.number().int().positive(),
    stake: z.coerce.number().int().positive(),
  }),
  z.object({
    action: z.literal("accept"),
    questId: z.coerce.number().int().positive(),
  }),
  z.object({
    action: z.literal("decline"),
    questId: z.coerce.number().int().positive(),
  }),
  z.object({
    action: z.literal("cancel"),
    questId: z.coerce.number().int().positive(),
  }),
]);

function blocked(user: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin" && !isOnboarded(user)) {
    return NextResponse.json({ error: "Finish verification first." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const user = await getSessionUser();
  const denied = blocked(user);
  if (denied) return denied;
  return NextResponse.json(getQuestsOverview(user!.id));
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const denied = blocked(user);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quest request." }, { status: 400 });
  }

  const data = parsed.data;
  const result =
    data.action === "invite"
      ? inviteQuest(user!, data.userId, data.stake)
      : data.action === "cancel"
        ? cancelQuest(user!, data.questId)
        : respondQuest(user!, data.questId, data.action === "accept");

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
