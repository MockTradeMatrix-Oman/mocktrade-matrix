import { NextResponse } from "next/server";
import { z } from "zod";
import { all, one, run, now, tx, type User } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";
import { initials } from "@/lib/finance";

const schema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  mode: z.string().default("student"),
  region: z.enum(["IN", "US"]).default("IN"),
  dob: z.string().optional(),
  guardianEmail: z.string().email().optional().or(z.literal("")),
});

function ageFrom(dob?: string) {
  if (!dob) return 30;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 30;
  return (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details." }, { status: 400 });
  }
  const { name, email, password, mode, region, dob, guardianEmail } = parsed.data;
  const existing = one<User>("SELECT id FROM users WHERE lower(email) = lower(?)", email);
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const minor = ageFrom(dob) < 18;
  if (minor && !guardianEmail) {
    return NextResponse.json({ error: "A guardian email is required for learners under 18." }, { status: 400 });
  }

  const password_hash = await hashPassword(password);
  const ts = now();
  const cash = region === "IN" ? 100_000 : 10_000;
  const cryptoCash = region === "IN" ? 15_000 : 1_500;
  const modules = all<{ id: number }>("SELECT id FROM modules WHERE is_published = 1 ORDER BY order_index");

  const uid = tx(() => {
    const r = run(
      `INSERT INTO users (email,password_hash,name,mode,region,arena_region,avatar,credits,cash,crypto_cash,start_capital,xp,streak,
        id_verified,guardian_status,guardian_email,terms_accepted,crash_done,accent,dob,created_at,last_seen)
       VALUES (?,?,?,?,?,?,?,100,?,?,?,0,1,0,?,?,1,0,'emerald',?,?,?)`,
      email.toLowerCase(), password_hash, name, mode, region, region, initials(name),
      cash, cryptoCash, cash, minor ? "pending" : "not_required", minor ? guardianEmail : null,
      dob || null, ts, ts
    );
    const id = r.lastId;
    modules.forEach((m, i) => {
      run("INSERT INTO module_progress (user_id,module_id,status,score,completed_at) VALUES (?,?,?,?,?)",
        id, m.id, i === 0 ? "unlocked" : "locked", 0, null);
    });
    run("INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
      id, "success", "Welcome to MockTrade Matrix", "Your account is ready. Verify your ID whenever you want to start trading.", ts);
    return id;
  });

  await setSession(uid);
  return NextResponse.json({ ok: true, redirect: "/dashboard" });
}
