import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox } from "@/components/ui/skeleton";

export default function BulkStatusLoading() {
  return (
    <ManagerShell active="bulk-status" user={{ name: "…" }}>
      <ContentHeader title="Bulk status update" />
      <div className="flex flex-none items-center gap-2 border-b border-hairline-2 bg-card px-4.5 py-3 md:px-6.5">
        {["w-24", "w-20", "w-16"].map((w, i) => (
          <SkeletonBox key={i} className={`h-9 ${w} flex-none rounded-full md:h-[28px]`} />
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 border-b border-hairline px-4.5 py-4 md:px-6.5">
            <SkeletonBox className="h-[22px] w-[22px] flex-none rounded" />
            <div className="min-w-0 flex-1">
              <SkeletonBox className="h-3.5 w-36" />
              <SkeletonBox className="mt-2 h-2.5 w-24" />
            </div>
            <SkeletonBox className="h-3.5 w-16 flex-none" />
          </div>
        ))}
      </div>
      <div className="flex-none border-t border-hairline-2 bg-card px-4.5 py-3.5 md:px-6.5">
        <SkeletonBox className="h-3 w-40" />
        <div className="mt-2.5 flex gap-2.5">
          <SkeletonBox className="h-[50px] flex-1 rounded-[5px]" />
          <SkeletonBox className="h-[50px] w-[110px] flex-none rounded-[5px]" />
        </div>
      </div>
    </ManagerShell>
  );
}
