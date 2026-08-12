import { NeutralLoadingShell } from "@/components/shell/neutral-loading-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox } from "@/components/ui/skeleton";

const GRID = "grid-cols-[1fr_1fr_.6fr_1fr_.9fr_1.1fr_1.1fr]";

function Row() {
  return (
    <div className={`grid ${GRID} items-center gap-2 border-b border-hairline px-4.5 py-3`}>
      <SkeletonBox className="h-3 w-16" />
      <SkeletonBox className="h-3 w-16" />
      <SkeletonBox className="ml-auto h-3 w-6" />
      <SkeletonBox className="ml-auto h-3 w-16" />
      <SkeletonBox className="h-3 w-12" />
      <SkeletonBox className="h-3 w-20" />
      <SkeletonBox className="ml-auto h-3 w-10" />
    </div>
  );
}

function Body() {
  return (
    <>
      <ContentHeader title="Today's sales" />
      <div className="flex min-h-0 flex-1 flex-col p-6.5">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`grid ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint`}
          >
            <div>WHEN</div>
            <div>SALE</div>
            <div className="text-right">ITEMS</div>
            <div className="text-right">TOTAL</div>
            <div>PAYMENT</div>
            <div>SOLD BY</div>
            <div className="text-right">ACTION</div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <Row key={i} />
          ))}
        </div>
      </div>
    </>
  );
}

// This is shared chrome (ManagerShell or StaffTopBar, by role) — see
// NeutralLoadingShell's own comment for why this doesn't try to render the
// real per-role chrome here. It used to (getCurrentUser(), branch on
// user?.role), which looked right in every quick check but turned out to be
// unsafe: confirmed live (11 Aug 2026) that a manager could still get a real
// flash of the shop_staff top bar from this exact branch under normal
// network latency, because a route's loading state can be served from a
// prefetch taken at a different moment than the request it ends up standing
// in for. Session-dependent branching inside loading.tsx isn't trustworthy
// full stop, not just here — see the other two routes with this same fix.
export default function TodaysSalesLoading() {
  return (
    <NeutralLoadingShell>
      <Body />
    </NeutralLoadingShell>
  );
}
