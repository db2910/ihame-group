import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox } from "@/components/ui/skeleton";

// Matches the real page's shape once it exists (KPI strip + 3-column report
// groups) rather than the old placeholder's generic "coming soon" note —
// see backlog.md's Phase 5 loading.tsx lesson: role-agnostic and data-free
// (plain ManagerShell, no badges), same as every other manager loading.tsx.
export default function ReportsLoading() {
  return (
    <ManagerShell active="reports" user={{ name: "…" }}>
      <ContentHeader
        title="Reports"
        right={
          <>
            <SkeletonBox className="h-11 w-28 md:h-[34px]" />
            <SkeletonBox className="h-11 w-28 md:h-[34px]" />
            <SkeletonBox className="h-11 w-16 md:h-[34px]" />
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6.5">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2.5 rounded-[5px] border border-border bg-card px-5 py-4.5">
                <SkeletonBox className="h-3 w-24" />
                <SkeletonBox className="h-6 w-20" />
                <SkeletonBox className="h-2.5 w-28" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, g) => (
              <div key={g} className="flex flex-col gap-3 rounded-[5px] border border-border bg-card p-4.5">
                <SkeletonBox className="h-3.5 w-20 border-b border-hairline-2 pb-2.5" />
                {Array.from({ length: 5 }).map((_, r) => (
                  <div key={r} className="flex items-center justify-between gap-3 border-b border-hairline py-2.5 last:border-b-0">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <SkeletonBox className="h-3 w-32" />
                      <SkeletonBox className="h-2.5 w-20" />
                    </div>
                    <SkeletonBox className="h-2.5 w-10 flex-none" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ManagerShell>
  );
}
