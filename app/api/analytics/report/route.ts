import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isPremium } from "@/lib/plans";
import { buildAnalytics } from "@/lib/analytics";
import { analyticsToCsv, analyticsToHtml } from "@/lib/analytics-format";

export const dynamic = "force-dynamic";

/**
 * Premium export endpoint. The check runs on the server so a client cannot
 * export the deep report by calling the URL directly on a Free account.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to export analytics." }, { status: 401 });
  }
  if (!isPremium(user)) {
    return NextResponse.json(
      { error: "Complete analytics is included with Premium." },
      { status: 403 }
    );
  }

  const report = buildAnalytics(user);
  const format = (new URL(req.url).searchParams.get("format") ?? "csv").toLowerCase();
  const stamp = new Date(report.generatedAt).toISOString().slice(0, 10);
  const base = `mocktrade-analytics-${stamp}`;

  if (format === "json") {
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  }

  if (format === "html") {
    return new NextResponse(analyticsToHtml(report), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.html"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(analyticsToCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
