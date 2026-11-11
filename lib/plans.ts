import "server-only";
import type { User } from "./db";
import {
  PREMIUM_MONTH_CREDITS as MONTH_CREDITS,
  PREMIUM_TERM_DAYS as TERM_DAYS,
} from "./plans-copy";

/**
 * Premium is activated with earned credits during the beta. No card, invoice
 * or real-money price exists in this build. 500 credits buys 30 days.
 */
export const PREMIUM_MONTH_CREDITS = MONTH_CREDITS;
export const PREMIUM_TERM_DAYS = TERM_DAYS;
export const PREMIUM_TERM_MS = PREMIUM_TERM_DAYS * 86_400_000;

export type Plan = "free" | "premium";

type PlanUser = Pick<User, "role" | "plan" | "premium_until" | "institution_access">;

export function isPremium(user: PlanUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.institution_access) return true;
  return user.plan === "premium" && Number(user.premium_until ?? 0) > Date.now();
}

export function premiumDaysLeft(user: PlanUser | null | undefined): number {
  if (!user || user.plan !== "premium" || !user.premium_until) return 0;
  const remaining = Number(user.premium_until) - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 86_400_000) : 0;
}

export function planOf(user: PlanUser | null | undefined): Plan {
  if (!user) return "free";
  return isPremium(user) ? "premium" : "free";
}

/**
 * Short, human label for the account badge. Admin and Institution access are
 * reported separately because they are grants, not credit subscriptions.
 */
export function planLabel(user: PlanUser | null | undefined): string {
  if (!user) return "Free";
  if (user.role === "admin") return "Admin";
  if (user.institution_access) return "Institution";
  if (isPremium(user)) {
    const days = premiumDaysLeft(user);
    return days > 0 ? `Premium · ${days}d left` : "Premium";
  }
  return "Free";
}

export function premiumRenewalFrom(user: PlanUser | null | undefined): number {
  const current = Number(user?.premium_until ?? 0);
  return Math.max(Date.now(), current);
}
