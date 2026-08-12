import { NeutralLoadingShell } from "@/components/shell/neutral-loading-shell";
import { SkeletonBox, SkeletonCardRow } from "@/components/ui/skeleton";
import { GRID } from "./grid";

function DesktopRow() {
  return (
    <div className={`hidden ${GRID} items-center gap-2 border-b border-hairline px-4.5 py-3.5 md:grid`}>
      <SkeletonBox className="h-3 w-20" />
      <SkeletonBox className="h-3 w-28" />
      <SkeletonBox className="h-3 w-32" />
      <SkeletonBox className="h-3 w-12" />
      <SkeletonBox className="h-3 w-14" />
      <SkeletonBox className="h-3 w-16" />
      <SkeletonBox className="ml-auto h-3 w-14" />
    </div>
  );
}

// /orders itself is freight-staff-only, but this loading.tsx isn't only
// shown for direct visits to /orders — Next.js can transiently use an
// ancestor segment's loading state while navigating into a nested dynamic
// route below it. /orders/[id] is a child segment here and is *not*
// freight-staff-only (a manager reaches it via All orders): confirmed live
// (11 Aug 2026) that this exact file's old unconditional StaffTopBar leaked
// through — as real "My orders" tab content, not just a generic shimmer —
// while a manager's navigation into /orders/[id] was still in flight. See
// NeutralLoadingShell's own comment for the fuller version of this.
export default function MyOrdersLoading() {
  return (
    <NeutralLoadingShell>
      <div className="flex items-center justify-between gap-3 border-b border-hairline-2 bg-card px-4.5 py-3.5 md:px-6.5">
        <div>
          <SkeletonBox className="h-5 w-28" />
          <SkeletonBox className="mt-2 h-3 w-40" />
        </div>
        <SkeletonBox className="h-11 w-[130px] flex-none rounded md:h-[34px]" />
      </div>
      <div className="border-b border-hairline-2 bg-card px-4.5 py-3 md:px-6.5">
        <SkeletonBox className="h-11 w-full rounded border border-input-border md:h-[34px] md:w-[240px]" />
      </div>
      <div className="flex flex-none items-center gap-2 border-b border-hairline-2 bg-card px-4.5 py-3 md:px-6.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBox key={i} className="h-9 w-16 rounded-full md:h-[26px] md:w-14" />
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6.5">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
          >
            <div>ORDER</div>
            <div>CUSTOMER</div>
            <div>GOODS</div>
            <div>DEST</div>
            <div>ETA</div>
            <div>STATUS</div>
            <div className="text-right">BALANCE</div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <DesktopRow />
                <SkeletonCardRow />
              </div>
            ))}
          </div>
        </div>
      </div>
    </NeutralLoadingShell>
  );
}
