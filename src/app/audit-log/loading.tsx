import { ManagerShell } from "@/components/shell/manager-shell";
import { ContentHeader } from "@/components/shell/content-header";
import { SkeletonBox } from "@/components/ui/skeleton";

const GRID = "grid-cols-[1fr_.9fr_1.2fr_1.3fr_1.3fr]";

// Matches the real filter form's own sizing exactly (h-11/16px on mobile so
// nothing jumps in height once the real selects mount — see the comment on
// the real form about why they're this tall).
function FilterControlSkeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer h-11 rounded md:h-[34px] ${className}`} />;
}

function Row() {
  return (
    <div className={`grid ${GRID} items-center gap-2 border-b border-hairline px-4.5 py-3`}>
      <SkeletonBox className="h-3.5 w-24" />
      <SkeletonBox className="h-3.5 w-20" />
      <div>
        <SkeletonBox className="h-3.5 w-28" />
        <SkeletonBox className="mt-1.5 h-3 w-16" />
      </div>
      <SkeletonBox className="h-3.5 w-24" />
      <SkeletonBox className="h-3.5 w-24" />
    </div>
  );
}

export default function AuditLogLoading() {
  return (
    <ManagerShell active="audit-log" user={{ name: "…" }}>
      <ContentHeader title="Audit log" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6.5">
        <div className="flex flex-wrap gap-2.5">
          <FilterControlSkeleton className="w-full sm:w-[150px]" />
          <FilterControlSkeleton className="w-full sm:w-[150px]" />
          <FilterControlSkeleton className="w-full sm:w-[150px]" />
          <FilterControlSkeleton className="w-full sm:w-[150px]" />
          <FilterControlSkeleton className="w-full sm:w-[92px]" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-border bg-card">
          <div
            className={`grid ${GRID} gap-2 border-b border-hairline-2 bg-row-hover px-4.5 py-2.5 font-mono text-[11.5px] font-medium tracking-[0.06em] text-ink-faint`}
          >
            <div>WHEN</div>
            <div>BY</div>
            <div>RECORD · FIELD</div>
            <div>OLD</div>
            <div>NEW</div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <Row key={i} />
          ))}
          <div className="mt-auto flex items-center justify-between border-t border-hairline px-4.5 py-2.5">
            <SkeletonBox className="h-3.5 w-36" />
          </div>
        </div>
      </div>
    </ManagerShell>
  );
}
