import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox } from "@/components/ui/skeleton";

function KpiSkeleton({ accent }: { accent: "brand" | "alert" }) {
  return (
    <div
      className={`flex flex-col rounded-[5px] border border-t-[3px] border-border bg-card px-5 py-4.5 ${
        accent === "alert" ? "border-t-alert" : "border-t-brand"
      }`}
    >
      <SkeletonBox className="h-3 w-32" />
      <SkeletonBox className="mt-3 h-9 w-16" />
      <SkeletonBox className="mt-2 h-3 w-40" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <ManagerShell active="dashboard" user={{ name: "…" }}>
      <ContentHeader title="Dashboard" />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6.5">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
            <KpiSkeleton accent="brand" />
            <KpiSkeleton accent="alert" />
            <div className="col-span-2 md:col-span-1">
              <KpiSkeleton accent="brand" />
            </div>
          </div>
          <div className="flex flex-col gap-4 md:grid md:grid-cols-[1.55fr_1fr] md:items-start">
            <div className="flex flex-col overflow-hidden rounded-[5px] border border-border bg-card">
              <div className="flex items-center justify-between border-b border-hairline-2 px-4.5 py-3">
                <SkeletonBox className="h-4 w-40" />
                <SkeletonBox className="h-3 w-28" />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 border-b border-hairline px-4.5 py-3">
                  <div className="min-w-0 flex-1">
                    <SkeletonBox className="h-3.5 w-32" />
                    <SkeletonBox className="mt-2 h-2.5 w-24" />
                  </div>
                  <SkeletonBox className="h-3.5 w-14 flex-none" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-[5px] border border-border bg-card p-4.5">
                <SkeletonBox className="h-4 w-36" />
                <div className="mt-3 flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonBox key={i} className="h-8 w-full" />
                  ))}
                </div>
              </div>
              <div className="flex-1 rounded-[5px] border border-border bg-card p-4.5">
                <SkeletonBox className="h-4 w-40" />
                <SkeletonBox className="mt-3.5 h-[74px] w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ManagerShell>
  );
}
