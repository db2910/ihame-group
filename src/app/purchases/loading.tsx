import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox } from "@/components/ui/skeleton";
import { GRID } from "./grid";

function DesktopRow() {
  return (
    <div className={`hidden ${GRID} items-center gap-2 border-b border-hairline px-4.5 py-3 md:grid`}>
      <SkeletonBox className="h-3 w-16" />
      <SkeletonBox className="h-3 w-32" />
      <SkeletonBox className="h-3 w-20" />
      <SkeletonBox className="ml-auto h-3 w-6" />
      <SkeletonBox className="ml-auto h-3 w-14" />
      <SkeletonBox className="h-3 w-24" />
    </div>
  );
}

function MobileRow() {
  return (
    <div className="border-b border-hairline px-4.5 py-3 md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SkeletonBox className="h-3.5 w-24" />
          <SkeletonBox className="mt-2 h-2.5 w-28" />
        </div>
        <div className="flex flex-none flex-col items-end gap-1.5">
          <SkeletonBox className="h-4 w-14" />
          <SkeletonBox className="h-2.5 w-10" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <SkeletonBox className="h-2.5 w-20" />
        <SkeletonBox className="h-2.5 w-20" />
      </div>
    </div>
  );
}

export default function PurchasesLoading() {
  return (
    <ManagerShell active="purchases" user={{ name: "…" }}>
      <ContentHeader
        title="Purchases"
        right={<SkeletonBox className="h-11 w-[110px] rounded md:h-[34px] md:w-[150px]" />}
      />
      <div className="flex min-h-0 flex-1 flex-col p-6.5">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
          >
            <div>PURCHASE</div>
            <div>SUPPLIER</div>
            <div>DATE</div>
            <div className="text-right">LINES</div>
            <div className="text-right">TOTAL</div>
            <div>RECORDED BY</div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <DesktopRow />
                <MobileRow />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ManagerShell>
  );
}
