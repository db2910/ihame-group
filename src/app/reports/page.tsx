import { requireRole } from "@/lib/auth/dal";
import { ManagerShellFrame } from "@/components/shell/manager-shell-frame";
import { ContentHeader } from "@/components/shell/content-header";
import { periodFromParams, periodQueryString, monthLabel } from "@/lib/reports/shared";
import { freightRevenue, shopRevenue, totalCashIn, receivables } from "@/lib/reports/kpis";
import { PeriodPicker } from "./period-picker";
import { ReportKpiStrip } from "./kpi-strip";
import { ReportGroups } from "./report-groups";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const manager = await requireRole(["manager"]);
  const params = await searchParams;
  const period = periodFromParams(params);
  const periodQuery = periodQueryString(period);

  const [freight, shop, cashIn, owed] = await Promise.all([
    freightRevenue(period),
    shopRevenue(period),
    totalCashIn(period),
    receivables(),
  ]);

  return (
    <ManagerShellFrame active="reports" user={manager}>
      <ContentHeader
        title="Reports"
        subtitle={`${monthLabel(period)} · base currency USD (freight) / RWF (shop)`}
        right={
          <>
            <PeriodPicker
              year={period.start.getUTCFullYear()}
              month={period.start.getUTCMonth() + 1}
              label={monthLabel(period)}
            />
            {/* Exports the same 4 figures as the "Monthly summary" report
                (its own detail page has the identical export under the same
                key) — reusing that route rather than a second copy of the
                same flattening logic. */}
            <a
              href={`/reports/monthly-summary/export?format=xlsx&${periodQuery}`}
              className="flex h-11 flex-none items-center rounded bg-dark px-4 font-sans text-[13px] font-medium text-white hover:opacity-90 md:h-[34px]"
            >
              Export Excel
            </a>
            <a
              href={`/reports/monthly-summary/export?format=pdf&${periodQuery}`}
              className="flex h-11 flex-none items-center rounded border border-input-border bg-card px-4 font-sans text-[13px] font-medium text-ink-secondary hover:bg-row-hover md:h-[34px]"
            >
              PDF
            </a>
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6.5">
        <div className="flex flex-col gap-4">
          <ReportKpiStrip freightRevenue={freight} shopRevenue={shop} cashIn={cashIn} receivables={owed} periodQuery={periodQuery} />
          <ReportGroups periodQuery={periodQuery} />
        </div>
      </div>
    </ManagerShellFrame>
  );
}
