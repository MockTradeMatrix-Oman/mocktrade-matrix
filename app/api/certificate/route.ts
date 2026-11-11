import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getCertificate } from "@/lib/exam";
import { certificateToHtml } from "@/lib/certificate-format";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Downloads the signed-in learner's certificate as a standalone HTML file. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to download your certificate." }, { status: 401 });
  }

  const certificate = getCertificate(user.id);
  if (!certificate) {
    return NextResponse.json(
      { error: "No certificate has been issued for this account yet." },
      { status: 404 }
    );
  }

  const format = (new URL(req.url).searchParams.get("format") ?? "html").toLowerCase();
  if (format === "json") {
    return NextResponse.json(certificate, { headers: { "Cache-Control": "no-store" } });
  }

  const origin = await siteOrigin();
  return new NextResponse(certificateToHtml(certificate, origin), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="mocktrade-certificate-${certificate.serial}.html"`,
      "Cache-Control": "no-store",
    },
  });
}
