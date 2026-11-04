import type { Metadata } from "next";
import { Developers } from "@/components/developers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Developers — MockTrade Matrix",
  description:
    "Meet the people behind MockTrade Matrix: Pranav Ramsingh, lead developer, and Madhavan KS, who created the core idea.",
};

export default function DevelopersPage() {
  return <Developers />;
}
