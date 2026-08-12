import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { reportMeta } from "@/lib/reports/registry";
import { periodFromParams, periodQueryString } from "@/lib/reports/shared";
import { buildReportData } from "@/lib/reports/view-data";
import { PeriodPicker } from "../period-picker";
import { ReportTable } from "./report-table";

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportKey: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const manager = await requireRole(["manager"]);
  const { reportKey } = await params;
  const meta = reportMeta(reportKey);
  if (!meta) notFound();

  const sp = await searchParams;
  const period = periodFromParams(sp);
  const periodQuery = periodQueryString(period);
  const data = await buildReportData(meta.key, period);

  return (
    <ManagerShellFrame active="reports" user={manager}>
      <ContentHeader
        title={data.title}
        subtitle={data.subtitle}
        right={
          <>
            <Link
              href={`/reports?${periodQuery}`}
              className="flex h-11 flex-none items-center rounded border border-input-border bg-card px-3.5 font-sans text-[13px] font-medium text-ink-secondary hover:bg-row-hover md:h-[34px]"
            >
              ← Reports
            </Link>
            {meta.periodScoped && (
              <PeriodPicker
                year={period.start.getUTCFullYear()}
                month={period.start.getUTCMonth() + 1}
                label={period.start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
              />
            )}
            <a
              href={`/reports/${meta.key}/export?format=xlsx&${periodQuery}`}
              className="flex h-11 flex-none items-center rounded bg-dark px-4 font-sans text-[13px] font-medium text-white hover:opacity-90 md:h-[34px]"
            >
              Export Excel
            </a>
            <a
              href={`/reports/${meta.key}/export?format=pdf&${periodQuery}`}
              className="flex h-11 flex-none items-center rounded border border-input-border bg-card px-4 font-sans text-[13px] font-medium text-ink-secondary hover:bg-row-hover md:h-[34px]"
            >
              PDF
            </a>
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6.5">
        <ReportTable data={data} />
      </div>
    </ManagerShellFrame>
  );
}
