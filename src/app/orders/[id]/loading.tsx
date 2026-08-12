import { NeutralLoadingShell } from "@/components/shell/neutral-loading-shell";
import { SkeletonBox } from "@/components/ui/skeleton";

function Body() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-3.5">
          <div className="flex items-center gap-3.5">
            <SkeletonBox className="h-3.5 w-20" />
            <SkeletonBox className="h-5 w-36" />
            <SkeletonBox className="h-5 w-20 rounded-full" />
          </div>
          <SkeletonBox className="h-11 w-full rounded-[5px]" />

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-[1.5fr_1fr]">
            <div className="flex flex-col gap-3.5">
              <div className="rounded-[5px] border border-border bg-card p-5 md:px-5.5">
                <SkeletonBox className="mb-3.5 h-3.5 w-16" />
                <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex justify-between border-b border-hairline py-2.5">
                      <SkeletonBox className="h-3 w-20" />
                      <SkeletonBox className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[5px] border border-border bg-card p-5 md:px-5.5">
                <SkeletonBox className="mb-3.5 h-3.5 w-24" />
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-hairline py-2">
                    <SkeletonBox className="h-3 w-[78px]" />
                    <SkeletonBox className="h-3 flex-1" />
                    <SkeletonBox className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              <SkeletonBox className="h-[136px] w-full rounded-[5px]" />
              <div className="rounded-[5px] border border-border bg-card p-5 md:px-5.5">
                <SkeletonBox className="mb-3.5 h-3.5 w-20" />
                <div className="flex gap-3 border-b border-hairline py-2.5">
                  <SkeletonBox className="h-11 w-11 flex-none" />
                  <div className="flex-1">
                    <SkeletonBox className="h-3.5 w-28" />
                    <SkeletonBox className="mt-2 h-3 w-36" />
                  </div>
                </div>
                <SkeletonBox className="mt-3.5 h-11 w-full" />
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

// This route serves both freight staff (their own orders, or the editable
// draft form) and managers (every order, via All orders) — see
// NeutralLoadingShell's own comment for why this doesn't try to render the
// real per-role chrome here.
export default function OrderDetailLoading() {
  return (
    <NeutralLoadingShell>
      <Body />
    </NeutralLoadingShell>
  );
}
