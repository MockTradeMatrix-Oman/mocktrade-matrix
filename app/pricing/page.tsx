import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { isPremium, planLabel } from "@/lib/plans";
import { PricingPage } from "@/components/pricing-page";
import { Wordmark } from "@/components/logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plans & access — MockTrade Matrix",
  description:
    "Free, Premium and Institution plans for MockTrade Matrix. Premium is 500 earned credits per month during the beta, with no cash charged.",
};

export default async function PricingRoute() {
  const user = await getSessionUser();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[620px]"
        style={{ background: "radial-gradient(60% 100% at 50% -20%, rgba(47,227,160,.1), transparent 70%)" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] grid-bg opacity-30" />

      <header className="relative z-20 border-b border-white/[0.06] bg-[#06080d]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[66px] max-w-[1180px] items-center gap-4 px-5">
          <Link href="/" className="shrink-0"><Wordmark /></Link>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="btn btn-primary btn-sm">Dashboard <ArrowRight size={13} /></Link>
            ) : (
              <>
                <Link href="/login" className="hidden px-3 py-2 text-[12px] font-medium text-muted transition hover:text-ink sm:block">Sign in</Link>
                <Link href="/signup" className="btn btn-primary btn-sm">Get started <ArrowRight size={13} /></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <PricingPage
        signedIn={Boolean(user)}
        premium={isPremium(user)}
        label={planLabel(user)}
        credits={user?.credits ?? 0}
      />
    </div>
  );
}
