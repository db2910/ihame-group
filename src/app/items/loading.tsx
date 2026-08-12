import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox, SkeletonCardRow } from "@/components/ui/skeleton";
import { GRID } from "./grid";

// Next shows this automatically while ItemsPage's data fetch is in flight —
// on first navigation into /items, and on same-route navigations (search,
// pagination, status filter) that resolve slowly enough to be noticeable.
// Rebuilds the real chrome (shell + header) around the skeleton rather than
// a bare placeholder, so nothing shifts once the real content swaps in.
function DesktopRow() {
  return (
    <div className={`hidden ${GRID} items-center gap-2 border-b border-hairline px-4.5 py-3.5 md:grid`}>
      <SkeletonBox className="h-3 w-16" />
      <SkeletonBox className="h-3 w-40" />
      <SkeletonBox className="h-3 w-20" />
      <SkeletonBox className="h-3 w-12" />
      <SkeletonBox className="ml-auto h-3 w-14" />
      <SkeletonBox className="ml-auto h-3 w-14" />
      <SkeletonBox className="ml-auto h-3 w-10" />
      <SkeletonBox className="ml-auto h-3 w-10" />
    </div>
  );
}

export default function ItemsLoading() {
  return (
    <ManagerShell active="items" user={{ name: "…" }}>
      <ContentHeader
        title="Items"
        right={
          <>
            <div className="shimmer h-11 w-full rounded border border-input-border md:h-[34px] md:w-[220px]" />
            <div className="shimmer h-11 w-[110px] flex-none rounded md:h-[34px] md:w-[92px]" />
          </>
        }
      />
      {/* Mirrors ItemsStatusBar (All / Low stock / Inactive pills) — without
          this row the skeleton is one row shorter than the real page, so
          everything below it jumps up the moment real content swaps in. */}
      <div className="flex flex-none items-center gap-2 border-b border-hairline-2 bg-card px-6.5 py-3">
        <SkeletonBox className="h-9 w-14 rounded-full md:h-[26px] md:w-12" />
        <SkeletonBox className="h-9 w-24 rounded-full md:h-[26px] md:w-20" />
        <SkeletonBox className="h-9 w-20 rounded-full md:h-[26px] md:w-16" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-6.5">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
          >
            <div>SKU</div>
            <div>ITEM</div>
            <div>CATEGORY</div>
            <div>UNIT</div>
            <div className="text-right">COST</div>
            <div className="text-right">SELL</div>
            <div className="text-right">ON HAND</div>
            <div className="text-right">REORDER</div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <DesktopRow />
                <SkeletonCardRow />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ManagerShell>
  );
}
