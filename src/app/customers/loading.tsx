import { NeutralLoadingShell } from "@/components/shell/neutral-loading-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox, SkeletonCardRow } from "@/components/ui/skeleton";

const GRID = "grid-cols-[.8fr_1.3fr_1fr_1.3fr_1fr_.6fr]";

function DesktopRow() {
  return (
    <div className={`hidden ${GRID} items-center gap-2 border-b border-hairline px-4.5 py-3 md:grid`}>
      <SkeletonBox className="h-3.5 w-16" />
      <SkeletonBox className="h-3.5 w-28" />
      <SkeletonBox className="h-3.5 w-24" />
      <SkeletonBox className="h-3.5 w-32" />
      <SkeletonBox className="h-3.5 w-20" />
      <div className="flex justify-end">
        <SkeletonBox className="h-3.5 w-8" />
      </div>
    </div>
  );
}

function Body() {
  return (
    <>
      <ContentHeader
        title="Customers"
        right={
          <>
            <div className="shimmer h-11 w-full rounded border border-input-border md:h-[34px] md:w-[240px]" />
            <div className="shimmer h-11 w-[130px] flex-none rounded md:h-9" />
          </>
        }
      />
      <div className="min-h-0 flex-1 p-4 md:p-6.5">
        <div className="flex flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`hidden ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint md:grid`}
          >
            <div>CODE</div>
            <div>NAME</div>
            <div>PHONE</div>
            <div>EMAIL</div>
            <div>ID NUMBER</div>
            <div className="text-right">ACTIONS</div>
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i}>
              <DesktopRow />
              <SkeletonCardRow />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Customers is shared chrome (ManagerShell or StaffTopBar, by role) — see
// NeutralLoadingShell's own comment for why this doesn't try to render the
// real per-role chrome here.
export default function CustomersLoading() {
  return (
    <NeutralLoadingShell>
      <Body />
    </NeutralLoadingShell>
  );
}
