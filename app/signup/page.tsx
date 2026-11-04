import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthShell, SignupForm } from "@/components/auth";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");
  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
