import { NeutralLoadingShell } from "@/components/shell/neutral-loading-shell";
import { SkeletonBox } from "@/components/ui/skeleton";

// Matches pos.tsx's real shape (search bar, category pills, item tile grid,
// cart panel) rather than a generic spinner, per the shimmer convention used
// by every other route's loading.tsx.
//
// /sale itself is shop-staff-primary, but this loading.tsx isn't only shown
// for direct visits to /sale — Next.js can transiently use an ancestor
// segment's loading state while navigating into a nested route below it, and
// /sale/today is a child segment here that a manager legitimately reaches
// too. Same fix, same reason, as orders/loading.tsx — see
// NeutralLoadingShell's own comment.
export default function SaleLoading() {
  return (
    <NeutralLoadingShell>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 p-4 md:p-5.5">
          <SkeletonBox className="h-11 w-full flex-none" />
          <div className="flex flex-none gap-2">
            {["w-10", "w-24", "w-16", "w-14", "w-20"].map((w, i) => (
              <SkeletonBox key={i} className={`h-7 ${w} flex-none rounded-full`} />
            ))}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonBox key={i} className="h-[104px] rounded-[6px]" />
            ))}
          </div>
        </div>
        {/* Desktop only — on a phone the cart is collapsed behind the bottom
            bar (and that bar only appears once something's in the cart), so
            a stub here would leave a gap the real screen doesn't have. */}
        <div className="hidden w-full flex-none flex-col gap-3 border-hairline-2 bg-card p-5 md:flex md:w-[404px] md:border-l">
          <SkeletonBox className="h-4 w-24" />
          <SkeletonBox className="h-3 w-16" />
        </div>
      </div>
    </NeutralLoadingShell>
  );
}
