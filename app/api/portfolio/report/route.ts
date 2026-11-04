import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { buildPortfolioReport } from "@/lib/report";
import { reportToCsv, reportToHtml } from "@/lib/report-format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to export your report." }, { status: 401 });
  }

  const report = buildPortfolioReport(user);
  const format = (new URL(req.url).searchParams.get("format") ?? "csv").toLowerCase();
  const stamp = new Date(report.generatedAt).toISOString().slice(0, 10);
  const base = `mocktrade-report-${stamp}`;

  if (format === "json") {
    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (format === "html") {
    return new NextResponse(reportToHtml(report), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.html"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(reportToCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
