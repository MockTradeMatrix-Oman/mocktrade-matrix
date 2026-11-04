import type { Metadata } from "next";
import { Legal } from "@/components/legal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legal & disclosures · MockTrade Matrix",
  description:
    "Simulation terms, privacy notice, guardian policy, risk disclosure and plan details for MockTrade Matrix — an educational markets simulation with zero real capital at risk.",
};

export default function LegalPage() {
  return <Legal />;
}
