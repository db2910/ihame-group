import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox } from "@/components/ui/skeleton";

// Mirrors page.tsx's own GRID constant — a plain Server Component (no "use
// client"), so this could import it directly, but every sibling loading.tsx
// in this project keeps its own local copy rather than reaching across files
// for a one-line string, and that's the convention followed here too.
const GRID = "grid-cols-[1fr_1.4fr_.8fr_.7fr_1.7fr_.9fr]";

function DesktopRow() {
  return (
    <div className={`hidden ${GRID} items-center gap-2 border-b border-hairline px-4.5 py-3 md:grid`}>
      <SkeletonBox className="h-3 w-20" />
      <SkeletonBox className="h-3 w-32" />
      <SkeletonBox className="h-3 w-16" />
      <SkeletonBox className="ml-auto h-3 w-12" />
      <SkeletonBox className="h-3 w-24" />
      <SkeletonBox className="h-3 w-20" />
    </div>
  );
}

function MobileRow() {
  return (
    <div className="grid grid-cols-[1fr_.7fr] items-start gap-2 border-b border-hairline px-4.5 py-3 md:hidden">
      <div className="min-w-0">
        <SkeletonBox className="h-3.5 w-32" />
        <SkeletonBox className="mt-2 h-2.5 w-40" />
        <SkeletonBox className="mt-2 h-2.5 w-20" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <SkeletonBox className="h-3.5 w-12" />
        <SkeletonBox className="h-2.5 w-16" />
      </div>
    </div>
  );
}

export default function StockMovementsLoading() {
  return (
    <ManagerShell active="stock-movements" user={{ name: "…" }}>
      <ContentHeader title="Stock movements" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6.5">
        <div className="flex flex-wrap gap-2.5">
          <SkeletonBox className="h-11 w-40 md:h-[34px]" />
          <SkeletonBox className="h-11 w-32 md:h-[34px]" />
          <SkeletonBox className="h-11 w-36 md:h-[34px]" />
          <SkeletonBox className="h-11 w-36 md:h-[34px]" />
          <SkeletonBox className="h-11 w-20 md:h-[34px]" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
          >
            <div>WHEN</div>
            <div>ITEM</div>
            <div>TYPE</div>
            <div className="text-right">QTY</div>
            <div>DETAIL</div>
            <div>BY</div>
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
