import Link from "next/link";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { Wordmark } from "@/components/logo";
import { GuardianConsent } from "@/components/guardian-consent";
import { ToastProvider } from "@/components/toast";

export const dynamic = "force-dynamic";

type RequestRow = {
  id: number;
  token: string;
  status: string;
  guardian_email: string;
  created_at: number;
  decided_at: number | null;
  note: string | null;
  user_id: number;
  name: string;
  email: string;
  region: string;
  mode: string;
  dob: string | null;
  guardian_status: string;
};

function ageFrom(dob: string | null) {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  return Math.floor((Date.now() - born.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export default async function GuardianPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = one<RequestRow>(
    `SELECT g.id, g.token, g.status, g.guardian_email, g.created_at, g.decided_at, g.note,
            u.id AS user_id, u.name, u.email, u.region, u.mode, u.dob, u.guardian_status
     FROM guardian_requests g JOIN users u ON u.id = g.user_id
     WHERE g.token = ?`,
    token
  );
  if (!row) notFound();

  return (
    <ToastProvider>
      <div className="relative min-h-screen bg-bg">
        <div className="pointer-events-none fixed inset-x-0 top-0 h-[480px]" style={{ background: "radial-gradient(55% 100% at 50% -10%, rgba(139,123,255,.14), transparent 70%)" }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] grid-bg opacity-25" />

        <div className="relative z-10 mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 sm:py-10">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/"><Wordmark /></Link>
            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">
              Guardian portal
            </span>
          </header>

          <main className="mt-6 sm:mt-9">
            <GuardianConsent
              token={row.token}
              initialStatus={row.status}
              guardianEmail={row.guardian_email}
              student={{
                name: row.name,
                email: row.email,
                region: row.region,
                mode: row.mode,
                age: ageFrom(row.dob),
                createdAt: row.created_at,
              }}
            />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
