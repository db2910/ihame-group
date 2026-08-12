import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox } from "@/components/ui/skeleton";

// Manager-only route (requireRole(["manager"]), no other role ever reaches
// this URL shape) — safe to use the real ManagerShell directly, same as
// orders/new/loading.tsx and sale/stock-lookup/loading.tsx.
export default function ReportDetailLoading() {
  return (
    <ManagerShell active="reports" user={{ name: "…" }}>
      <ContentHeader
        title="Loading report…"
        right={
          <>
            <SkeletonBox className="h-11 w-24 md:h-[34px]" />
            <SkeletonBox className="h-11 w-28 md:h-[34px]" />
            <SkeletonBox className="h-11 w-16 md:h-[34px]" />
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6.5">
        <div className="flex flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div className="flex gap-6 border-b border-hairline-2 bg-row-hover px-4 py-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBox key={i} className="h-3 w-16" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-6 border-b border-hairline px-4 py-3 last:border-b-0">
              {Array.from({ length: 4 }).map((_, j) => (
                <SkeletonBox key={j} className="h-3.5 w-20" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </ManagerShell>
  );
}
