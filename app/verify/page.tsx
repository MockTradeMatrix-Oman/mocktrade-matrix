import { redirect } from "next/navigation";
import { getSessionUser, isOnboarded } from "@/lib/auth";
import { ToastProvider } from "@/components/toast";
import { VerifyWizard } from "@/components/verify";

export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isOnboarded(user)) redirect("/dashboard");

  return (
    <ToastProvider>
      <VerifyWizard
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          id_verified: user.id_verified,
          verified_name: user.verified_name,
          verified_address: user.verified_address,
          guardian_status: user.guardian_status,
          terms_accepted: user.terms_accepted,
          guardian_email: user.guardian_email,
          dob: user.dob,
        }}
      />
    </ToastProvider>
  );
}
