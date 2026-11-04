import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { one, run, now, type User } from "./db";

export const SESSION_COOKIE = "mtm_token";
const DEV_SECRET = "mtm_dev_8f3a91c47be25d0fa6c1e9b7348d52ac1f0e6b9d";

// Resolved lazily so `next build` never fails when the runtime secret is not
// present at build time. server.mjs refuses to boot in production without it.
function sessionSecret() {
  const value = process.env.AUTH_SECRET || (process.env.NODE_ENV !== "production" ? DEV_SECRET : "");
  if (!value) throw new Error("AUTH_SECRET is required in production");
  return new TextEncoder().encode(value);
}

export async function signToken(userId: number) {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(sessionSecret());
}

export async function readToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return Number(payload.uid);
  } catch {
    return null;
  }
}

export async function setSession(userId: number) {
  const token = await signToken(userId);
  // No maxAge / expires on purpose: this is a browser-session cookie, so closing
  // the browser (or reopening the app) requires signing in again. The token also
  // expires after 12 hours in case the browser restores the session.
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // HTTPS is required in production. Set COOKIE_SECURE=false only when
    // testing a production build locally over plain http://localhost.
    secure:
      process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === "true"
        : process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export type PublicUser = Omit<User, "password_hash">;

export function toPublic(user: User): PublicUser {
  const { password_hash, ...rest } = user;
  return rest;
}

export const getSessionUser = cache(async (): Promise<PublicUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const uid = await readToken(token);
  if (!uid) return null;
  const user = one<User>("SELECT * FROM users WHERE id = ?", uid);
  if (!user) return null;
  return toPublic(user);
});

export async function requireUser(): Promise<PublicUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // Identity checks are not a gate on the whole app: learners can sign in and
  // explore with their starting balance straight away. Verification is required
  // at the point simulated capital is committed (trading and the capital shop).
  return user;
}

export function isOnboarded(u: PublicUser) {
  return Boolean(u.id_verified && u.terms_accepted && ["approved", "not_required"].includes(u.guardian_status));
}

export function isAdmin(u: PublicUser | null | undefined) {
  return u?.role === "admin";
}

export function hasInstitutionAccess(u: PublicUser | null | undefined) {
  return Boolean(u && (u.role === "admin" || u.institution_access));
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export async function requireInstitution(): Promise<PublicUser> {
  const user = await requireUser();
  if (!hasInstitutionAccess(user)) redirect("/dashboard");
  return user;
}

export function touchUser(userId: number) {
  run("UPDATE users SET last_seen = ? WHERE id = ?", now(), userId);
}
