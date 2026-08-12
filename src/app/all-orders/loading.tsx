import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox, SkeletonCardRow } from "@/components/ui/skeleton";
import { GRID_WITH_STAFF } from "@/app/orders/grid";

function DesktopRow() {
  return (
    <div className={`hidden ${GRID_WITH_STAFF} items-center gap-2 border-b border-hairline px-4.5 py-3.5 md:grid`}>
      <SkeletonBox className="h-3 w-20" />
      <SkeletonBox className="h-3 w-28" />
      <SkeletonBox className="h-3 w-32" />
      <SkeletonBox className="h-3 w-12" />
      <SkeletonBox className="h-3 w-16" />
      <SkeletonBox className="h-3 w-14" />
      <SkeletonBox className="h-3 w-16" />
      <SkeletonBox className="ml-auto h-3 w-14" />
    </div>
  );
}

export default function AllOrdersLoading() {
  return (
    <ManagerShell active="all-orders" user={{ name: "…" }}>
      <ContentHeader title="All orders" />
      <div className="flex flex-col gap-2.5 border-b border-hairline-2 bg-card px-4.5 py-3 md:px-6.5">
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBox key={i} className="h-9 w-16 rounded-full md:h-[28px] md:w-14" />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonBox className="h-11 w-full flex-1 rounded border border-input-border md:h-[34px] md:w-[220px] md:flex-none" />
          <SkeletonBox className="h-11 w-32 flex-none rounded md:h-[34px]" />
          <SkeletonBox className="h-11 w-28 flex-none rounded md:h-[34px]" />
          <SkeletonBox className="h-11 w-48 flex-none rounded md:h-[34px]" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6.5">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`hidden ${GRID_WITH_STAFF} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
          >
            <div>ORDER</div>
            <div>CUSTOMER</div>
            <div>GOODS</div>
            <div>DEST</div>
            <div>STAFF</div>
            <div>ETA</div>
            <div>STATUS</div>
            <div className="text-right">BALANCE</div>
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
