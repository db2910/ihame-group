import Link from "next/link";
import { REPORTS, GROUP_LABEL, type ReportGroupKey } from "@/lib/reports/registry";

const GROUPS: ReportGroupKey[] = ["freight", "shop", "combined"];

// The mock's 3-column Freight/Shop/Combined grid, each row an "OPEN →" link
// into the shared report detail page — src/app/reports/[reportKey]/page.tsx.
export function ReportGroups({ periodQuery }: { periodQuery: string }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
      {GROUPS.map((g) => (
        <div key={g} className="flex flex-col rounded-[5px] border border-border bg-card p-4.5">
          <div className="mb-1 border-b border-hairline-2 pb-2.5 font-sans text-[13.5px] font-semibold text-ink">
            {GROUP_LABEL[g]}
          </div>
          {REPORTS.filter((r) => r.group === g).map((r) => (
            <Link
              key={r.key}
              href={`/reports/${r.key}?${periodQuery}`}
              className="flex items-center justify-between gap-3 border-b border-hairline py-2.5 last:border-b-0 hover:bg-row-hover"
            >
              <div className="min-w-0">
                <div className="truncate font-sans text-[13px] text-ink">{r.name}</div>
                <div className="truncate font-sans text-[11px] text-ink-faint">{r.description}</div>
              </div>
              <span className="flex-none font-mono text-[11px] font-medium text-brand">OPEN →</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
