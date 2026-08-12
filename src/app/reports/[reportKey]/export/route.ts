import type { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { reportMeta } from "@/lib/reports/registry";
import { periodFromParams } from "@/lib/reports/shared";
import { buildReportData } from "@/lib/reports/view-data";
import { toExcelBuffer, toPdfBuffer, bufferResponse } from "@/lib/reports/export";

// Calls the exact same buildReportData() the detail page renders from, so
// a report's export can never show something the screen didn't — same rule
// Phase 5's CSV exports established for Dashboard/All-orders.
export async function GET(request: NextRequest, { params }: { params: Promise<{ reportKey: string }> }) {
  await requireRole(["manager"]);

  const { reportKey } = await params;
  const meta = reportMeta(reportKey);
  if (!meta) notFound();

  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const period = periodFromParams(searchParams);
  const data = await buildReportData(meta.key, period);

  const stamp = `${period.start.getUTCFullYear()}-${String(period.start.getUTCMonth() + 1).padStart(2, "0")}`;
  const filenameSafe = meta.key;

  if (format === "pdf") {
    const buf = await toPdfBuffer(data);
    return bufferResponse(buf, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${filenameSafe}-${stamp}.pdf"`,
    });
  }

  const buf = await toExcelBuffer(data);
  return bufferResponse(buf, {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="report-${filenameSafe}-${stamp}.xlsx"`,
  });
}
