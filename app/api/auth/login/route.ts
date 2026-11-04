import { NextResponse } from "next/server";
import { z } from "zod";
import { one, run, now, ADMIN_EMAIL, ADMIN_PASSWORD, type User } from "@/lib/db";
import { checkPassword, setSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  // The admin signs in with the short ID "admin" instead of an email address.
  const identifier = parsed.data.email;
  const email = identifier.toLowerCase() === "admin" ? ADMIN_EMAIL : identifier;

  const user = one<User>("SELECT * FROM users WHERE lower(email) = lower(?)", email);
  if (!user) return NextResponse.json({ error: "No account found with those details." }, { status: 401 });

  // The administrator has one fixed password. It is checked in addition to the
  // stored hash so the console cannot be opened with a student password.
  if (user.role === "admin" && parsed.data.password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Admin access requires the administrator password." }, { status: 401 });
  }

  const ok = await checkPassword(parsed.data.password, user.password_hash);
  if (!ok) return NextResponse.json({ error: "That password does not match our records." }, { status: 401 });

  run("UPDATE users SET last_seen = ? WHERE id = ?", now(), user.id);
  await setSession(user.id);
  return NextResponse.json({
    ok: true,
    redirect: user.role === "admin" ? "/admin" : "/dashboard",
    name: user.name,
  });
}
